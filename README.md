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

## Документация

- API/роль-модель: `./frontend-staff.md`, `./api-overview.md`
- SMTP-заметки: `./frontend-smtp.md`
- План и конспект по скриншотам: `./docs/admin-ui-plan.md`

## Запуск

```bash
npm install
REACT_APP_API_BASE_URL=https://api.maribeauty.ru npm start
```

Или через `.env`:

```bash
echo "REACT_APP_API_BASE_URL=https://api.maribeauty.ru" > .env
npm start
```

## Сборка

```bash
npm run build
```
