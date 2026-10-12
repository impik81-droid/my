# Cloudflare Push setup notes

- Pages project: `my`
- Production domain: `https://my-6su.pages.dev`
- Account ID: `e6dbf8b99d6a43f138613af6422819e5`
- D1 database: `my-db`
- D1 database ID: `76390381-11d9-456f-933c-af3af00d892a`
- Pages production binding: `DB`
- VAPID public key is configured as Pages production variable `VAPID_PUBLIC_KEY`.
- Server endpoints added in the repository: `/api/push` and `/api/timer`.
- Remaining deployment step: deploy a Worker with a Cron Trigger that reads due rows from `rest_timers`, sends Web Push using the VAPID private key, and marks timers sent. The private key is kept only in the local protected temporary file `/tmp/vapid-keys.txt` and must not be committed.
