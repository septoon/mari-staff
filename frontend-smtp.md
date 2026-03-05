# Frontend SMTP Guide (Short)

## 1) Что важно понять
- Frontend не отправляет письма напрямую.
- Письма отправляет backend через SMTP-провайдера.
- Собственный SMTP-сервер на VPS не поднимаем.

Схема:
`Frontend -> Backend API -> SMTP Provider -> Recipient`

## 2) Для чего это
- лучшая доставляемость;
- меньше риск попадания в spam;
- не нужно администрировать Postfix/Exim.

## 3) Что делает frontend
- вызывает backend endpoint отправки;
- показывает статус отправки и ошибки;
- не хранит SMTP-логин/пароль.

Endpoint'ы, где backend отправляет email:
- `POST /promocodes/:id/send`
- `POST /staff/invite` (если у сотрудника передан `email`)
- `POST /staff/reset-pin/request` (если у сотрудника есть `email`)
- `POST /auth/client/password/reset/request` (если найден `ClientAccount` с `email`)

Body для promo:
- `email` или `phone` или `clientId`

Пример:
```json
{
  "phone": "+7 978 677-81-30"
}
```

## 4) Что должен настроить backend/infra
- системный ящик, например `notifications@domain.ru`;
- SMTP-доступ и пароль приложения;
- env-переменные:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
  - `STAFF_WEB_BASE_URL` (домен staff-ссылок `/staff/set-pin` и `/staff/reset-pin`)
  - `CLIENT_WEB_BASE_URL`
  - `CLIENT_WEB_RESET_PASSWORD_PATH` (путь страницы reset клиента, например `/reset-password`)

## 5) DNS обязательно
- SPF
- DKIM
- DMARC

Без этого письма часто идут в spam.

## 6) Поведение в dev и prod
- Если SMTP не настроен: backend вернет `deliveryMode=DEV_LOG` и `preview`.
- Если SMTP настроен: `deliveryMode=SMTP` и `messageId`.

Уточнение по endpoint'ам:
- `POST /promocodes/:id/send` всегда возвращает `deliveryMode/messageId/preview`.
- `POST /staff/invite` возвращает `emailSent`, `emailDeliveryMode`, `emailMessageId` (и `emailPreview` в dev).
- `POST /staff/reset-pin/request` и `POST /auth/client/password/reset/request` всегда отвечают `sent: true` (детали доставки в ответ не включаются).

## 7) Рекомендации по адресам
- для авто-писем: `notifications@domain.ru` / `no-reply@domain.ru`;
- для общения с клиентами: `support@domain.ru` / `contact@domain.ru`.

## 8) Ограничения
- у провайдеров есть лимиты отправки;
- для массовых рекламных рассылок лучше отдельные email-marketing сервисы.
