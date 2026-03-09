# API Overview

## Базовый формат ответа
Успех:
```json
{ "ok": true, "data": {}, "meta": {} }
```

Ошибка:
```json
{
  "ok": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable",
    "details": {}
  }
}
```

## Основные endpoint'ы
- `GET /health`

### Auth Client
- `POST /auth/client/register`
- `POST /auth/client/login`
- `POST /auth/client/refresh`
- `POST /auth/client/logout`

### Auth Staff
- `POST /auth/staff/login`
- `POST /auth/staff/refresh`
- `POST /auth/staff/logout`

### Staff
- `GET /staff`
- `POST /staff/invite`
- `POST /staff/set-pin`
- `POST /staff/reset-pin/request`
- `POST /staff/reset-pin/confirm`
- `PATCH /staff/:id/contact`
- `GET /staff/:id/services`
- `PUT /staff/:id/services`
- `PATCH /staff/:id/role`
- `POST /staff/:id/fire`
- `POST /staff/:id/permissions`
- `DELETE /staff/:id/permissions/:code`

### Clients / Loyalty
- `GET /clients`
- `GET /clients/:id`
- `PATCH /clients/:id/discount`
- `GET /clients/loyalty/list`
- `POST /clients/loyalty/upsert`

### Promo Codes
- `GET /promocodes/validate`
- `GET /promocodes`
- `POST /promocodes`
- `PATCH /promocodes/:id`
- `POST /promocodes/:id/send`

### Services
- `GET /services/public`
- `GET /services`

### Settings
- `GET /settings/public`
- `GET /settings/staff`
- `PATCH /settings/client-cancel-policy`
- `PATCH /settings/privacy-policy`

### Schedule
- `GET /schedule/staff/:staffId/working-hours`
- `PUT /schedule/staff/:staffId/working-hours`
- `GET /schedule/staff/:staffId/time-off`
- `POST /schedule/staff/:staffId/time-off`
- `DELETE /schedule/time-off/:id`
- `GET /schedule/staff/:staffId/blocks`
- `POST /schedule/staff/:staffId/blocks`
- `DELETE /schedule/blocks/:id`

### Appointments
- `GET /appointments/slots`
- `GET /appointments`
- `POST /appointments`
- `PATCH /appointments/:id/status`
- `PATCH /appointments/:id/reschedule`
- `POST /appointments/:id/payments`
- `GET /appointments/:id/payments`
- `GET /master/appointments`
- `GET /master/clients/:clientId/summary`
- `GET /client/appointments`
- `POST /client/appointments/:id/cancel`

### Imports/Exports/Reports
- `POST /imports/clients`
- `POST /imports/services`
- `POST /imports/appointments`
- `POST /imports/schedule`
- `GET /imports/:jobId`
- `GET /exports/clients.xlsx`
- `GET /exports/services.xlsx`
- `GET /exports/appointments.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`

## Auth payloads (phone-first)
- `POST /auth/staff/login`: `{ "phone": "...", "pin": "1234" }`
- `POST /auth/staff/refresh`: `{ "refreshToken": "..." }`
- `POST /auth/staff/logout`: `{ "refreshToken": "..." }`
- `POST /auth/client/register`: `{ "phone": "...", "password": "...", "name"?: "...", "email"?: "..." }`
- `POST /auth/client/login`: `{ "phone": "...", "password": "..." }`
- `POST /staff/invite`: `{ "phone": "...", "name": "...", "role": "ADMIN|MASTER|DEVELOPER|SMM", "email"?: "..." }`

## Settings payloads
- `GET /settings/public`: `{ "clientCancelPolicy": { "minNoticeMinutes": number }, "privacyPolicy": { "content": string } }`
- `GET /settings/staff`: тот же payload для авторизованного staff.
- `PATCH /settings/client-cancel-policy`: `{ "minNoticeMinutes": number }`
- `PATCH /settings/privacy-policy`: `{ "content": "..." }`

## Нюансы скидок и промокодов
- Скидки клиента: постоянная + временная (`from/to`).
- Приоритет скидок при создании записи:
  1. `discountOverride`
  2. `promoCode`
  3. временная скидка клиента
  4. постоянная скидка клиента
- SMTP для отправки промокодов опционален.
  - если не настроен: `deliveryMode=DEV_LOG` и `preview`.
  - если настроен: `deliveryMode=SMTP`.

## Детальные контракты для фронта
- Клиентский фронт: `scripts/frontend-clients.md`
- Staff/Owner/Admin фронт: `scripts/frontend-staff.md`
