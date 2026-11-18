(function () {
  "use strict";

  // ---- CONFIG: change these in one place ----
  var CONFIG = {
    whatsapp: "919170917071",
    agreementValue: 5689220, // Basic price used for the payment schedule
    // Server endpoint that emails + WhatsApps each lead to the team (see server.js).
    leadEndpoint: "/api/lead",
    // Exit popup: on touch devices (no mouse "exit"), show after this many seconds instead.
    exitPopupMobileDelay: 40
  };

  function postLead(data) {
    return fetch(CONFIG.leadEndpoint, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { if (!r.ok) throw new Error("lead " + r.status); return r.json(); });
  }
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} }
  };

  // WhatsApp links: open chat with a pre-filled greeting
  var waHref = "https://wa.me/" + CONFIG.whatsapp + "?text=" +
    encodeURIComponent("Hi, I'm interested in 17 Insignia (1 BHK, Pancard Club Road, Baner). Please share details.");
  document.querySelectorAll(".js-wa").forEach(function (a) { a.href = waHref; });

  // Header state + mobile menu
  var header = document.querySelector(".site-header");
  var nav = document.getElementById("nav");
  var toggle = document.querySelector(".nav-toggle");
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  function setMenu(open) {
    nav.classList.toggle("open", open);
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });

  // Reveal on scroll
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  // Floor plans
  var PLANS = [
    {
      img: "assets/img/layout.jpg", title: "1 BHK Unit Plan", area: "340 sq.ft carpet",
      dims: [["Living", "12'10\" × 8'11\""], ["Bedroom", "10' × 9'"], ["Kitchen", "7'2\" × 8'9\""], ["Toilet", "5'1\" × 8'11\""]],
      note: "Separate bedroom, living room and kitchen with a planter balcony along the façade."
    },
    {
      img: "assets/img/3D_layout.jpg", title: "1 BHK — 3D View", area: "Isometric render",
      dims: [["Living", "12'10\" × 8'11\""], ["Bedroom", "10' × 9'"], ["Kitchen", "7'2\" × 8'9\""], ["Toilet", "5'1\" × 8'11\""]],
      note: "See how a complete 1 BHK lives — furniture placement, storage and natural light."
    },
    {
      img: "assets/img/1stto7th_floor.jpg", title: "Typical Floor Plan", area: "1st to 6th floor",
      dims: [["Lifts", "2"], ["Lobby", "4' wide"], ["Unit type", "1 BHK"]],
      note: "Efficient double-loaded corridor with twin lifts and a central staircase."
    },
    {
      img: "assets/img/7th_floor.jpg", title: "7th Floor Plan", area: "Select units with private terrace",
      dims: [["Terrace", "9'10\" × 10'4\""], ["Lifts", "2"], ["Unit type", "1 BHK"]],
      note: "Top-floor homes with private terraces — ask our team about availability."
    },
    {
      img: "assets/img/3D_floor.jpg", title: "Floor — 3D View", area: "Isometric render",
      dims: [["Lifts", "2"], ["Unit type", "1 BHK"]],
      note: "A bird's-eye view of a typical residential floor."
    }
  ];
  var planImg = document.getElementById("planImg");
  var planInfo = document.getElementById("planInfo");
  var tabs = document.querySelectorAll(".tabs button");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function showPlan(i) {
    var p = PLANS[i];
    tabs.forEach(function (t, j) { t.setAttribute("aria-selected", String(i === j)); });
    planImg.style.opacity = 0;
    var pre = new Image();
    pre.onload = function () { planImg.src = p.img; planImg.alt = p.title; planImg.style.opacity = 1; };
    pre.src = p.img;
    planInfo.innerHTML =
      "<h3>" + esc(p.title) + "</h3><p class='area'>" + esc(p.area) + "</p>" +
      "<ul class='dims'>" + p.dims.map(function (d) { return "<li><span>" + esc(d[0]) + "</span><b>" + esc(d[1]) + "</b></li>"; }).join("") + "</ul>" +
      "<p>" + esc(p.note) + "</p><a href='#enquire' class='btn btn-gold btn-block'>Request Floor Plan PDF</a>";
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showPlan(+t.dataset.plan); }); });
  showPlan(0);

  // Lightbox
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  function openLb(src, alt) { lbImg.src = src; lbImg.alt = alt || ""; lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closeLb() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  lb.addEventListener("click", function (e) { if (e.target !== lbImg) closeLb(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  document.querySelectorAll(".g-item").forEach(function (b) {
    b.addEventListener("click", function () { openLb(b.dataset.full, b.querySelector("img").alt); });
  });
  document.querySelector(".plan-zoom").addEventListener("click", function () { openLb(planImg.src, planImg.alt); });

  // Video
  var frame = document.querySelector(".video-frame");
  var video = document.getElementById("walkVideo");
  frame.querySelector(".video-play").addEventListener("click", function () {
    frame.classList.add("playing");
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  });
  video.addEventListener("play", function () { frame.classList.add("playing"); });

  // Payment schedule
  var SCHEDULE = [
    ["Booking amount (before agreement)", 10],
    ["Agreement execution", 10],
    ["Completion of plinth / foundation", 15],
    ["Completion of 1st slab", 10],
    ["Completion of 3rd slab", 10],
    ["Completion of 7th slab", 10],
    ["Walls, internal plaster & flooring", 10],
    ["Doors, windows & sanitary fittings", 10],
    ["External plaster & waterproofing", 5],
    ["Lifts, water pumps & electricals", 5],
    ["On possession (Occupancy Certificate)", 5]
  ];
  var fmt = new Intl.NumberFormat("en-IN");
  document.getElementById("schedule").innerHTML = SCHEDULE.map(function (s) {
    var amt = Math.round(CONFIG.agreementValue * s[1] / 100);
    return "<li><span>" + esc(s[0]) + "</span><span class='amt'>₹ " + fmt.format(amt) + "</span><span class='pct'>" + s[1] +
      "%</span><span class='bar'><i style='width:" + (s[1] / 15 * 100) + "%'></i></span></li>";
  }).join("");

  // Enquiry form
  var form = document.getElementById("enquiryForm");
  var status = document.getElementById("formStatus");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var phone = form.phone.value.trim();
    var ok = true;
    form.name.classList.toggle("invalid", !name); if (!name) ok = false;
    var phoneOk = /^[0-9+\s-]{10,15}$/.test(phone);
    form.phone.classList.toggle("invalid", !phoneOk); if (!phoneOk) ok = false;
    if (!form.consent.checked) ok = false;
    if (!ok) { status.className = "form-status err"; status.textContent = "Please enter your name, a valid mobile number and accept the consent."; return; }

    var data = { name: name, phone: phone, email: form.email.value.trim(), purpose: form.purpose.value,
      website: form.website.value, source: "enquiry-form" };

    // Notify the team by email + WhatsApp in the background, then open WhatsApp for the visitor as before.
    postLead(data).catch(function () {});
    store.set("lead_sent", "1");

    var msg = "Hi, I'm interested in 17 Insignia (1 BHK, Baner).\nName: " + data.name + "\nPhone: " + data.phone +
      (data.email ? "\nEmail: " + data.email : "") + "\nPurpose: " + data.purpose + "\nPlease share details / schedule a site visit.";
    window.open("https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
    status.className = "form-status ok"; status.textContent = "Opening WhatsApp to send your enquiry…";
  });

  // Exit-intent popup: shows once per visit, never after a lead has been sent.
  var pop = document.getElementById("exitPop");
  var exitForm = document.getElementById("exitForm");
  var exitStatus = document.getElementById("exitStatus");
  var lastFocus = null;
  var armedAt = Date.now() + 6000; // don't fire in the first few seconds
  function popAllowed() {
    return !store.get("lead_sent") && !store.get("exit_seen") && !lb.classList.contains("open") &&
      !nav.classList.contains("open") && !form.contains(document.activeElement);
  }
  function openPop() {
    if (!popAllowed() || Date.now() < armedAt) return;
    store.set("exit_seen", "1", true);
    lastFocus = document.activeElement;
    pop.hidden = false;
    pop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { pop.classList.add("open"); });
    setTimeout(function () { exitForm.name.focus({ preventScroll: true }); }, 60);
  }
  function closePop() {
    pop.classList.remove("open");
    pop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(function () { pop.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  pop.querySelector(".exit-close").addEventListener("click", closePop);
  pop.addEventListener("click", function (e) { if (e.target === pop) closePop(); });
  document.addEventListener("keydown", function (e) {
    if (pop.hidden) return;
    if (e.key === "Escape") closePop();
    if (e.key === "Tab") { // keep focus inside the dialog
      var f = Array.prototype.filter.call(pop.querySelectorAll("button, a[href], input:not([tabindex='-1'])"),
        function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // Desktop: pointer leaves through the top of the window (towards the tabs / close button).
  document.documentElement.addEventListener("mouseleave", function (e) { if (e.clientY <= 0) openPop(); });
  // Touch devices have no "exit" gesture: show after a while on the page instead.
  if (window.matchMedia("(hover: none)").matches) {
    setTimeout(openPop, CONFIG.exitPopupMobileDelay * 1000);
  }

  exitForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = exitForm.name.value.trim();
    var phone = exitForm.phone.value.trim();
    var phoneOk = /^[0-9+\s-]{10,16}$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
    exitForm.name.classList.toggle("invalid", !name);
    exitForm.phone.classList.toggle("invalid", !phoneOk);
    if (!name || !phoneOk) { exitStatus.className = "form-status err"; exitStatus.textContent = "Please enter your name and a valid mobile number."; return; }
    var btn = exitForm.querySelector("button[type=submit]");
    btn.disabled = true; exitStatus.className = "form-status"; exitStatus.textContent = "Sending…";
    postLead({ name: name, phone: phone, website: exitForm.website.value, source: "exit-popup" })
      .then(function () {
        store.set("lead_sent", "1");
        exitForm.hidden = true;
        pop.querySelector(".exit-done").hidden = false;
      })
      .catch(function () {
        btn.disabled = false;
        exitStatus.className = "form-status err";
        exitStatus.innerHTML = "Couldn't send right now. Please <a href='tel:+919170917071'>call</a> or <a class='js-wa' target='_blank' rel='noopener' href='" + waHref + "'>WhatsApp us</a>.";
      });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
