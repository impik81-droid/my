# Workout Diary — Cloudflare

## Файлы
- `index.html` — приложение
- `functions/api/auth.js` — регистрация/вход
- `functions/api/data.js` — облачные данные
- `functions/api/push.js` — регистрация Push-подписки
- `functions/api/timer.js` — постановка серверного таймера
- `push-worker-entry.js` — Cloudflare Worker с Cron для отправки Push
- `schema.sql` — D1

## Cloudflare Pages
1. Создай GitHub-репозиторий и загрузи все файлы.
2. В Cloudflare Pages подключи этот репозиторий.
3. Для проекта создай D1 database, например `workout-db`.
4. В Pages → Settings → Functions → D1 Bindings привяжи базу к имени `DB`.
5. Выполни `schema.sql` в D1.
6. В Variables/Secrets добавь `AUTH_SECRET` — длинную случайную строку.
7. Открой сайт. Зарегистрируй один и тот же аккаунт на iPhone и компьютере.

Для Push в Pages production уже добавлен `VAPID_PUBLIC_KEY`. Worker отправки должен быть опубликован с D1 binding `DB`, Cron `* * * * *` и secret `VAPID_PRIVATE_KEY`; приватный ключ нельзя добавлять в GitHub. После публикации Worker будет выбирать истёкшие строки из `rest_timers`, отправлять Web Push и помечать их отправленными.

После входа сохранения синхронизируются через D1. Локальная копия остаётся доступной без сети.
