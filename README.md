# Mari Staff Admin UI

Mobile-first админка салона красоты `Mari`, реализованная на `Create React App + TypeScript + Tailwind`.

## Что реализовано

- 5 экранов по референсам:
  - `Журнал`
  - `График`
  - `Клиенты`
  - `Уведомления`
  - `Еще`
- Нижний таб-бар с переключением экранов.
- Брендинг `Mari` (без `YCLIENTS`).
- Визуальные токены и стили, близкие к предоставленным скриншотам.
- Во вкладке `Еще` добавлен отдельный экран `Политика конфиденциальности` с чтением из `/settings/staff` и сохранением через `/settings/privacy-policy`.

## Документация

- API/роль-модель: `./frontend-staff.md`, `./api-overview.md`
- SMTP-заметки: `./frontend-smtp.md`
- План и конспект по скриншотам: `./docs/admin-ui-plan.md`

## Запуск

```bash
npm install
REACT_APP_API_BASE_URL=https://api.maribeauty.ru \
REACT_APP_BOT_ID=123456:telegram-bot-token \
REACT_APP_CHANNEL_ID=-1001234567890 \
npm start
```

Или через `.env`:

```bash
echo "REACT_APP_API_BASE_URL=https://api.maribeauty.ru" > .env
echo "REACT_APP_BOT_ID=123456:telegram-bot-token" >> .env
echo "REACT_APP_CHANNEL_ID=-1001234567890" >> .env
npm start
```

## Сборка

```bash
npm run build
```

## PWA запуск

`service worker` подключается только в production-сборке.

```bash
npm run build
npx serve -s build
```

После запуска открой приложение в браузере и установи его как приложение (Install/Add to Home Screen).
