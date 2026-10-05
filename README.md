# Workout Diary — Cloudflare

## Файлы
- `index.html` — приложение
- `functions/api/auth.js` — регистрация/вход
- `functions/api/data.js` — облачные данные
- `schema.sql` — D1

## Cloudflare Pages
1. Создай GitHub-репозиторий и загрузи все файлы.
2. В Cloudflare Pages подключи этот репозиторий.
3. Для проекта создай D1 database, например `workout-db`.
4. В Pages → Settings → Functions → D1 Bindings привяжи базу к имени `DB`.
5. Выполни `schema.sql` в D1.
6. В Variables/Secrets добавь `AUTH_SECRET` — длинную случайную строку.
7. Открой сайт. Зарегистрируй один и тот же аккаунт на iPhone и компьютере.

После входа сохранения синхронизируются через D1. Локальная копия остаётся доступной без сети.
