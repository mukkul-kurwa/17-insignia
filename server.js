// 17 Insignia — static site + lead notifications (email via Gmail, WhatsApp via CallMeBot).
// No framework: Node's http module serves the static files (with Range support for the video)
// and POST /api/lead fans each enquiry out to email + WhatsApp.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;

// ---- Settings (set these as Railway variables; never commit them) ----
const ENV = {
  gmailUser: process.env.GMAIL_USER || "",
  gmailPass: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, ""),
  emailTo: process.env.LEAD_EMAIL_TO || process.env.GMAIL_USER || "",
  cmbPhone: (process.env.CALLMEBOT_PHONE || "919170917071").replace(/\D/g, ""),
  cmbKey: process.env.CALLMEBOT_APIKEY || ""
};
// Test hook: LEAD_DRY_RUN=1 logs notifications instead of sending them.
const DRY_RUN = process.env.LEAD_DRY_RUN === "1";

// ---- Static files ----
// Only these paths are public; server code, package files and Docker config are never served.
const PUBLIC_DIRS = ["/assets/", "/css/", "/js/"];
const PUBLIC_FILES = new Set(["/index.html", "/favicon.ico"]);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".mp4": "video/mp4", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2", ".pdf": "application/pdf"
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".svg", ".json", ".txt"]);

function resolvePublic(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p === "/") p = "/index.html";
  if (p.includes("\0")) return null;
  const norm = path.posix.normalize(p);
  if (!PUBLIC_FILES.has(norm) && !PUBLIC_DIRS.some((d) => norm.startsWith(d))) return null;
  const abs = path.join(ROOT, norm);
  if (!abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

function sendStatic(req, res, abs) {
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const ext = path.extname(abs).toLowerCase();
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const headers = {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "ETag": etag,
      "Last-Modified": st.mtime.toUTCString(),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=604800"
    };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }

    // Byte ranges (lets visitors skip ahead in the walkthrough video)
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start, end;
      if (m && (m[1] || m[2])) {
        if (m[1]) { start = +m[1]; end = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1; }
        else { start = Math.max(0, st.size - +m[2]); end = st.size - 1; }
      }
      if (start === undefined || start > end || start >= st.size) {
        res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end();
      }
      headers["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
      headers["Content-Length"] = end - start + 1;
      res.writeHead(206, headers);
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(abs, { start, end }).pipe(res);
    }

    const enc = String(req.headers["accept-encoding"] || "");
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(enc)) {
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
      res.writeHead(200, headers);
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(abs).pipe(zlib.createGzip()).pipe(res);
    }
    headers["Content-Length"] = st.size;
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(abs).pipe(res);
  });
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

// ---- Lead handling ----
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function escHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const SOURCES = { "exit-popup": "Exit popup", "enquiry-form": "Enquiry form" };

async function sendEmail(lead) {
  if (!ENV.gmailUser || !ENV.gmailPass || !ENV.emailTo) throw new Error("email not configured");
  const rows = [["Name", lead.name], ["Mobile", lead.phone], ["Email", lead.email || "—"],
    ["Interested in", lead.purpose || "—"], ["Source", lead.sourceLabel], ["Time", lead.time]];
  const text = rows.map((r) => `${r[0]}: ${r[1]}`).join("\n");
  const html = `<h2 style="font-family:Arial,sans-serif;color:#1c1814">New lead — 17 Insignia</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows.map((r) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#7a6f63">${r[0]}</td><td style="padding:6px 0"><b>${escHtml(String(r[1]))}</b></td></tr>`).join("")}</table>
<p style="font-family:Arial,sans-serif;font-size:14px"><a href="tel:${escHtml(lead.phoneDigits)}">Call</a> · <a href="https://wa.me/${escHtml(lead.waDigits)}">WhatsApp</a></p>`;
  const msg = {
    from: `"17 Insignia Website" <${ENV.gmailUser}>`,
    to: ENV.emailTo,
    subject: `New lead: ${lead.name} (${lead.phone}) — 17 Insignia`,
    text, html
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) msg.replyTo = lead.email;
  if (DRY_RUN) { console.log("[dry-run] email", JSON.stringify(msg)); return; }
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: ENV.gmailUser, pass: ENV.gmailPass } });
  await t.sendMail(msg);
}

async function sendWhatsApp(lead) {
  if (!ENV.cmbKey || !ENV.cmbPhone) throw new Error("whatsapp not configured");
  const text = `*New lead — 17 Insignia*\nName: ${lead.name}\nMobile: ${lead.phone}` +
    (lead.email ? `\nEmail: ${lead.email}` : "") + (lead.purpose ? `\nInterested in: ${lead.purpose}` : "") +
    `\nSource: ${lead.sourceLabel}\nChat: https://wa.me/${lead.waDigits}`;
  const url = "https://api.callmebot.com/whatsapp.php?phone=" + ENV.cmbPhone +
    "&text=" + encodeURIComponent(text) + "&apikey=" + encodeURIComponent(ENV.cmbKey);
  if (DRY_RUN) { console.log("[dry-run] whatsapp", text); return; }
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await r.text();
  if (!r.ok || /invalid|error|not\s+(?:active|allowed)/i.test(body)) throw new Error(`callmebot ${r.status}: ${body.slice(0, 160)}`);
}

async function handleLead(req, res) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (rateLimited(ip)) return json(res, 429, { ok: false, error: "Too many requests" });

  let data;
  try { data = JSON.parse(await readBody(req, 8 * 1024)); } catch { return json(res, 400, { ok: false, error: "Bad request" }); }
  if (!data || typeof data !== "object") return json(res, 400, { ok: false, error: "Bad request" });

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (clean(data.website, 200)) return json(res, 200, { ok: true });

  const name = clean(data.name, 80);
  const phone = clean(data.phone, 20);
  const digits = phone.replace(/\D/g, "");
  if (!name || !/^[0-9+\s-]{10,16}$/.test(phone) || digits.length < 10) {
    return json(res, 422, { ok: false, error: "Please enter your name and a valid mobile number." });
  }
  const source = Object.prototype.hasOwnProperty.call(SOURCES, data.source) ? data.source : "enquiry-form";
  const lead = {
    name, phone,
    email: clean(data.email, 120),
    purpose: clean(data.purpose, 60),
    sourceLabel: SOURCES[source],
    phoneDigits: (phone.trim().startsWith("+") ? "+" : "") + digits,
    waDigits: digits.length === 10 ? "91" + digits : digits,
    time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST",
    id: crypto.randomBytes(4).toString("hex")
  };

  // Backup copy in Railway's logs, in case both channels fail.
  console.log(`[lead ${lead.id}] ${lead.sourceLabel} | ${lead.name} | ${lead.phone} | ${lead.email || "-"} | ${lead.purpose || "-"}`);

  const [em, wa] = await Promise.allSettled([sendEmail(lead), sendWhatsApp(lead)]);
  if (em.status === "rejected") console.error(`[lead ${lead.id}] email failed: ${em.reason && em.reason.message}`);
  if (wa.status === "rejected") console.error(`[lead ${lead.id}] whatsapp failed: ${wa.reason && wa.reason.message}`);
  const delivered = em.status === "fulfilled" || wa.status === "fulfilled";
  return json(res, delivered ? 200 : 502, { ok: delivered, email: em.status === "fulfilled", whatsapp: wa.status === "fulfilled" });
}

// ---- Server ----
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/lead") {
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); return res.end(); }
    return handleLead(req, res).catch((e) => { console.error("lead error", e); json(res, 500, { ok: false }); });
  }
  if (url.pathname === "/healthz") return json(res, 200, { ok: true });
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
  const abs = resolvePublic(url.pathname);
  if (!abs) return notFound(res);
  sendStatic(req, res, abs);
});

server.listen(PORT, () => {
  console.log(`17 Insignia listening on :${PORT}` + (DRY_RUN ? " (lead dry-run)" : ""));
  console.log(`email: ${ENV.gmailUser && ENV.gmailPass ? "on" : "OFF (set GMAIL_USER, GMAIL_APP_PASSWORD)"} | ` +
    `whatsapp: ${ENV.cmbKey ? "on" : "OFF (set CALLMEBOT_APIKEY)"}`);
});
