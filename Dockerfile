# Static hosting for the 17 Insignia landing page (Railway or any Docker host).
FROM caddy:2.8-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY . /srv
