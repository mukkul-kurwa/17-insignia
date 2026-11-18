# 17 Insignia — landing page

Static site: `index.html`, `css/style.css`, `js/main.js`, `assets/`. Open via any static host (Netlify, Vercel, GitHub Pages, cPanel).

Local preview: `python -m http.server 8417 --directory site` → http://localhost:8417

## Deploy on Railway
`Dockerfile` + `Caddyfile` serve the folder with Caddy on Railway's `$PORT` (gzip, 7-day caching for assets, video seeking supported; Dockerfile/Caddyfile/README are not served).
1. Install the CLI: `npm i -g @railway/cli` (or `scoop install railway`), then `railway login`.
2. From this `site` folder: `railway init` (new project) → `railway up`.
3. Railway dashboard → service → Settings → Networking → **Generate Domain** (gives a `*.up.railway.app` URL), or add a custom domain and create the CNAME it shows at your DNS provider.
Redeploy after changes with `railway up` again.

## Before going live
1. **Walkthrough video** — done. `assets/video/walkin.mp4` is a 43 MB web version (1080p, 25 fps, H.264 High 2-pass 1450 kbps, AAC 96 kbps, faststart) encoded from the original `17_insignia_walkin.mp4`, which is unchanged. To re-encode:
   `ffmpeg -i 17_insignia_walkin.mp4 -vf fps=25 -c:v libx264 -preset slow -b:v 1450k -pass 1 -an -f mp4 NUL` then the same with `-pass 2 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart site/assets/video/walkin.mp4`.
   Note: the local `python -m http.server` preview can't seek in video; real hosts can.
2. **Logo** — done. Rebuilt from the low-res 476×142 PNG on 17insignia.com (kept as `assets/img/logo/logo.png` for reference):
   - `mark.svg` — the gold "17" circle redrawn as vector geometry (sharp at any size).
   - The "INSIGNIA" wordmark is live text in the Jost font (closest match), so it stays crisp; the tagline is HTML text.
   - `favicon-32.png`, `mark-180.png`, `mark-512.png`, `apple-touch-icon.png` — icons rendered from the same geometry.
   If the designer supplies the official vector logo, swap it in for the `.logo` markup in `index.html`.
3. **Enquiry form** — decided: enquiries go to WhatsApp (+91 9170917071) with the visitor's details pre-filled. Leave `CONFIG.formEndpoint` in `js/main.js` empty.
4. **Prices / phone numbers** — cost sheet lives in `index.html` (#pricing); payment schedule and agreement value in `js/main.js`.

## Images
Web copies in `assets/img/` were generated from the originals in the project folder (max 2200 px, `-sm` = 900 px). Interior/lifestyle renders were extracted from the brochure PDF.
