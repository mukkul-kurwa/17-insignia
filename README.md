# 17 Insignia — landing page

Site: `index.html`, `css/style.css`, `js/main.js`, `assets/`. Served by `server.js` (Node, no framework), which also handles `POST /api/lead`.
Only `index.html`, `/assets/`, `/css/` and `/js/` are public; server code and config are never served.

Local preview: `npm install` then `$env:LEAD_DRY_RUN=1; node server.js` → http://localhost:8080 (dry-run logs leads instead of sending them).

## Deploy on Railway
Repo: github.com/mukkul-kurwa/17-insignia, connected to Railway. Every push to `main` redeploys (Dockerfile → `node:22-alpine`).
Live: https://17-insignia-production.up.railway.app

## Lead notifications (exit popup + enquiry form)
Each lead is emailed (Gmail) and WhatsApped (CallMeBot) to the team, and also written to Railway's logs as a backup (`[lead …]` lines).
Set these in Railway → service → **Variables** (never commit them):

| Variable | Value |
|---|---|
| `GMAIL_USER` | Gmail address that sends the email |
| `GMAIL_APP_PASSWORD` | 16-character app password (Google Account → Security → 2-Step Verification → App passwords) |
| `LEAD_EMAIL_TO` | Where lead emails go (optional; defaults to `GMAIL_USER`; comma-separate for several) |
| `CALLMEBOT_APIKEY` | From CallMeBot: follow the WhatsApp steps at callmebot.com (send their bot `I allow callmebot to send me messages` from +91 9170917071); it replies with the key |
| `CALLMEBOT_PHONE` | Optional; defaults to `919170917071` |

The deploy log's first lines show `email: on | whatsapp: on` when both are configured.
Popup behaviour (in `js/main.js`): desktop shows it when the pointer leaves through the top of the window; phones show it after `exitPopupMobileDelay` (40 s). Once per visit, and never again after the visitor has sent a lead.

## Before going live
1. **Walkthrough video** — done. `assets/video/walkin.mp4` is a 43 MB web version (1080p, 25 fps, H.264 High 2-pass 1450 kbps, AAC 96 kbps, faststart) encoded from the original `17_insignia_walkin.mp4`, which is unchanged. To re-encode:
   `ffmpeg -i 17_insignia_walkin.mp4 -vf fps=25 -c:v libx264 -preset slow -b:v 1450k -pass 1 -an -f mp4 NUL` then the same with `-pass 2 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart site/assets/video/walkin.mp4`.
2. **Logo** — done. Rebuilt from the low-res 476×142 PNG on 17insignia.com (kept as `assets/img/logo/logo.png` for reference):
   - `mark.svg` — the gold "17" circle redrawn as vector geometry (sharp at any size).
   - The "INSIGNIA" wordmark is live text in the Jost font (closest match), so it stays crisp; the tagline is HTML text.
   - `favicon-32.png`, `mark-180.png`, `mark-512.png`, `apple-touch-icon.png` — icons rendered from the same geometry.
   If the designer supplies the official vector logo, swap it in for the `.logo` markup in `index.html`.
3. **Enquiry form** — sends the lead to `/api/lead` (email + WhatsApp alert to the team) and still opens WhatsApp (+91 9170917071) for the visitor with their details pre-filled.
4. **Prices / phone numbers** — cost sheet lives in `index.html` (#pricing); payment schedule and agreement value in `js/main.js`.

## Images
Web copies in `assets/img/` were generated from the originals in the project folder (max 2200 px, `-sm` = 900 px). Interior/lifestyle renders were extracted from the brochure PDF.
