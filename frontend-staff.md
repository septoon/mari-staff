# Frontend спецификация: Приложение персонала (OWNER / ADMIN / MASTER / DEVELOPER / SMM)

Документ фиксирует **фактический** backend-контракт для staff-приложения.

См. также:
- `scripts/frontend-smtp.md` — краткая инструкция по SMTP и отправке писем через backend.

## 1. Роли и доступы

## 1.1 Роли
- `OWNER` (Владелец)
- `ADMIN`
- `MASTER`
- `DEVELOPER`
- `SMM`

## 1.2 Встроенные ограничения ролей

`OWNER`:
- полный доступ ко всем staff endpoint'ам;
- автоматически проходит `hasPermission` как суперпользователь;
- может менять роли, увольнять, выдавать/отзывать permissions.

`ADMIN`:
- может приглашать сотрудников (`/staff/invite`), редактировать контакты, назначать услуги, работать с imports/exports/services/reports;
- не может менять `OWNER`;
- может менять роли сотрудников при наличии `EDIT_STAFF`;
- не может увольнять;
- не может выдавать permissions.

`MASTER`:
- логин;
- может создать запись через `POST /appointments` (без `discountOverride`);
- может смотреть `GET /master/clients/:clientId/summary`.

`DEVELOPER`, `SMM`:
- логин в staff-приложение;
- доступ к разделам определяется выданными permission-кодами.

## 1.3 Permission-коды (для OWNER-управления)
Актуальный каталог permission-кодов:
- `VIEW_JOURNAL`
- `EDIT_JOURNAL`
- `VIEW_SCHEDULE`
- `EDIT_SCHEDULE`
- `VIEW_CLIENTS`
- `EDIT_CLIENTS`
- `VIEW_SERVICES`
- `EDIT_SERVICES`
- `VIEW_STAFF`
- `EDIT_STAFF`
- `EDIT_SELF_PROFILE`
- `VIEW_FINANCIAL_STATS`
- `MANAGE_CLIENT_DISCOUNTS`
- `MANAGE_PROMOCODES`
- `MANAGE_CLIENT_FRONT`
- `PUBLISH_CLIENT_FRONT`
- `MANAGE_MEDIA`

Важно:
- `OWNER` проходит permission-проверки всегда;
- `ADMIN` получает доступ к лояльности/промокодам только если OWNER выдал соответствующий permission.

## 2. Глобальные правила API

## 2.1 Формат ответа
Успех:
```json
{
  "ok": true,
  "data": {}
}
```

Ошибка:
```json
{
  "ok": false,
  "error": {
    "code": "STRING_CODE",
    "message": "...",
    "details": {}
  }
}
```

## 2.2 Авторизация
```http
Authorization: Bearer <accessToken>
```

## 2.3 Длительности токенов
По env:
- `ACCESS_TOKEN_TTL_SEC` (по умолчанию 900)
- `REFRESH_TOKEN_TTL_SEC` (по умолчанию 30 дней)

## 2.4 Staff session lifecycle
В текущем API есть полный lifecycle:
- `POST /auth/staff/login`
- `POST /auth/staff/refresh`
- `POST /auth/staff/logout`

## 2.5 Типы данных (для DTO/TypeScript)
- `uuid`: `string` (UUID v4)
- `phone`: `string` (backend нормализует в `phone10/phoneE164`)
- `phoneE164`: `string` (`+7XXXXXXXXXX`)
- `isoDate`: `string` (`YYYY-MM-DD`)
- `isoDateTime`: `string` (ISO 8601 UTC)
- `money`: `number` (в JSON, в БД `Decimal`)
- `boolFlag`: `boolean`
- `StaffRole`: `'OWNER' | 'ADMIN' | 'MASTER' | 'DEVELOPER' | 'SMM'`
- `DiscountType`: `'NONE' | 'FIXED' | 'PERCENT'`
- `AppointmentStatus`: `'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED'`
- `PaymentStatus`: `'UNPAID' | 'PARTIAL' | 'PAID'`
- `PaymentMethod`: `'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'`

## 3. Сотрудники: модель данных для UI

Поля staff, с которыми работает API:
- `id: uuid`
- `name: string`
- `role: OWNER|ADMIN|MASTER`
- `phoneE164: string` (канонический вывод телефона)
- `email: string|null`
- `isActive: boolean`
- `hiredAt: Date|null`
- `firedAt: Date|null`
- `position: { id, name } | null` ("Специализация")

## 4. Auth staff

## 4.1 Логин
### `POST /auth/staff/login`
Body:
```json
{
  "phone": "+7 978 677-81-30",
  "pin": "1234"
}
```

PIN:
- только цифры;
- длина `4..8`.

Успех `200`:
```json
{
  "ok": true,
  "data": {
    "staff": {
      "id": "uuid",
      "name": "Акопян Айарпи Робертовна",
      "role": "OWNER",
      "phoneE164": "+79786778130",
      "email": "beautymari2024@gmail.com"
    },
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt",
      "expiresInSec": 900
    }
  }
}
```

Ошибка `401 AUTH_REQUIRED`:
```json
{
  "ok": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Invalid credentials"
  }
}
```

## 4.2 Refresh
### `POST /auth/staff/refresh`

Body:
```json
{
  "refreshToken": "jwt"
}
```

Успех `200`: возвращает актуальные `staff` + `tokens`.

## 4.3 Logout
### `POST /auth/staff/logout`

Body:
```json
{
  "refreshToken": "jwt"
}
```

Успех `200`:
```json
{
  "ok": true,
  "data": {
    "revoked": true
  }
}
```

## 5. Онбординг персонала (invite -> set pin)

## 5.1 Приглашение сотрудника
### `POST /staff/invite`
Доступ: `ADMIN`, `OWNER`.

Body:
```json
{
  "phone": "+7 978 318-89-83",
  "email": "menzatova29@icloud.com",
  "name": "Амаля",
  "role": "MASTER",
  "positionName": "Мастер маникюра/педикюра",
  "hiredAt": "2026-03-01"
}
```

Правила:
- Upsert по `phone10`.
- Если найден `OWNER`, ADMIN не может его менять (`403`).
- Email уникален среди staff.
- `positionName` апсертится в `Position`.
- Создается `StaffToken(type='SET_PIN', ttl=3 дня)`.
- `inviteLink` строится от `STAFF_WEB_BASE_URL`: `${STAFF_WEB_BASE_URL}/staff/set-pin?token=...`.
- Если у сотрудника есть `email`, backend сразу отправляет письмо "придумайте PIN" через SMTP.

Ответ `201`:
```json
{
  "ok": true,
  "data": {
    "staffId": "uuid",
    "inviteLink": "https://staff.maribeauty.ru/staff/set-pin?token=<raw-token>",
    "emailSent": true,
    "emailDeliveryMode": "SMTP",
    "emailMessageId": "<smtp-message-id>"
  }
}
```

Важно для фронта:
- Backend API-only: `GET /staff/set-pin?...` не существует как HTML-страница.
- Реальный сценарий: фронт забирает `token` из query на своей странице и отправляет в `POST /staff/set-pin`.

## 5.2 Установка PIN
### `POST /staff/set-pin`
Public endpoint.

Body:
```json
{
  "token": "raw-token-from-invite-link",
  "pin": "1234"
}
```

Успех `200`:
```json
{
  "ok": true,
  "data": {
    "staff": {
      "id": "uuid",
      "role": "MASTER",
      "name": "Амаля"
    },
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt",
      "expiresInSec": 900
    }
  }
}
```

Ошибки:
- `404 NOT_FOUND` token не найден/просрочен/уже used.
- `400 VALIDATION_ERROR` pin не 4..8 цифр.

## 5.3 Сброс PIN (запрос)
### `POST /staff/reset-pin/request`
Public endpoint.

Body:
```json
{
  "phone": "+7 978 318-89-83"
}
```

Всегда `200`:
```json
{
  "ok": true,
  "data": {
    "sent": true,
    "resetLink": "https://staff.maribeauty.ru/staff/reset-pin?token=..."
  }
}
```

`resetLink` включается только при `NODE_ENV != production` и `DEV_SHOW_LINKS=true`.

Важно:
- для уволенного/неактивного сотрудника backend не создает reset-token (ответ остается `sent: true`, но ссылка не генерируется).
- если у сотрудника есть `email`, backend отправляет письмо восстановления PIN.
- путь для staff строго `"/staff/reset-pin"` (не `"/reset-password"`).

## 5.4 Сброс PIN (подтверждение)
### `POST /staff/reset-pin/confirm`
Public endpoint.

Body:
```json
{
  "token": "raw-token",
  "newPin": "1234"
}
```

Успех `200`: staff + tokens.

Поведение:
- помечает токен used;
- отзывает все старые staff sessions (`revokeAllSubjectSessions`).
- для уволенного/неактивного сотрудника подтверждение reset запрещено (token считается недействительным).

## 6. Управление сотрудниками

## 6.1 Список сотрудников
### `GET /staff?page=1&limit=50&role=MASTER&isActive=true&search=Амаля`
Доступ: `ADMIN`, `OWNER`.

Возвращает:
- базовые поля сотрудника;
- `position`;
- активные permissions;
- pagination в `meta`.

## 6.2 Обновление контактных данных
### `PATCH /staff/:id/contact`
Доступ: `ADMIN`, `OWNER`.

Body:
```json
{
  "phone": "+7 978 318-89-83",
  "name": "Амаля",
  "email": "menzatova29@icloud.com",
  "positionName": "Мастер маникюра/педикюра"
}
```

Нюансы:
- `phone` обязателен;
- `email` можно передать `null` для очистки;
- `positionName` апсертится;
- ADMIN не может редактировать OWNER;
- phone/email уникальны.

Ответ `200`:
```json
{
  "ok": true,
  "data": {
    "staff": {
      "id": "uuid",
      "name": "Амаля",
      "phoneE164": "+79783188983",
      "email": "menzatova29@icloud.com",
      "position": {
        "id": "uuid",
        "name": "Мастер маникюра/педикюра"
      },
      "role": "MASTER",
      "isActive": true
    }
  }
}
```

## 6.3 Роль сотрудника
### `PATCH /staff/:id/role`
Доступ: `OWNER` или staff с permission `EDIT_STAFF`.

Body:
```json
{
  "role": "ADMIN"
}
```

Можно назначать только `ADMIN|MASTER|DEVELOPER|SMM`.
`OWNER` через этот endpoint менять нельзя.

## 6.4 Увольнение
### `POST /staff/:id/fire`
Доступ: только `OWNER`.

Body:
```json
{
  "firedAt": "2026-03-01"
}
```

Бизнес-правило:
- если есть будущие записи (`status != CANCELLED/NO_SHOW`) -> `422`:
```json
{
  "ok": false,
  "error": {
    "code": "STAFF_HAS_FUTURE_APPOINTMENTS",
    "message": "Cannot fire staff with future appointments",
    "details": {
      "futureCount": 3
    }
  }
}
```

`OWNER` уволить нельзя (`403`).

После увольнения backend делает сразу:
- `isActive=false`, `firedAt=<дата>`;
- отзыв всех активных staff-сессий (мгновенный logout на сервере);
- инвалидирует все неиспользованные `SET_PIN/RESET_PIN` токены.

Следствие:
- логин по PIN больше не работает;
- запрос/подтверждение reset PIN больше не работает до восстановления сотрудника.

## 7. Специализация и услуги мастера

## 7.1 Специализация
Специализация хранится через `Position` и задается:
- при `POST /staff/invite` полем `positionName`;
- при `PATCH /staff/:id/contact` полем `positionName`.

## 7.2 Услуги сотрудника: чтение
### `GET /staff/:id/services`
Доступ: `ADMIN`, `OWNER`.

Ответ `200`:
```json
{
  "ok": true,
  "data": {
    "staffId": "uuid",
    "servicesCount": 12,
    "items": [
      {
        "id": "service-uuid",
        "name": "Маникюр",
        "category": {
          "id": "cat-uuid",
          "name": "Ногтевой сервис"
        },
        "durationSec": 3600,
        "priceMin": 1500,
        "priceMax": 1800,
        "isActive": true
      }
    ]
  }
}
```

## 7.3 Услуги сотрудника: полная замена
### `PUT /staff/:id/services`
Доступ: `ADMIN`, `OWNER`.

Body:
```json
{
  "serviceIds": ["uuid1", "uuid2", "uuid3"]
}
```

Нюанс:
- это **replace-all**, не patch.
- backend сначала удаляет все связи, затем создает новые.

Рекомендация для UI:
- загружать текущий список;
- редактировать чеклист;
- отправлять полный финальный массив.

## 8. Permissions (только OWNER)

## 8.1 Выдать/обновить permission
### `POST /staff/:id/permissions`
Body:
```json
{
  "code": "VIEW_FINANCIAL_STATS",
  "expiresAt": "2026-12-31T20:59:59.000Z"
}
```

Если permission code не существует — создается автоматически.

## 8.2 Отозвать permission
### `DELETE /staff/:id/permissions/:code`
Ответ всегда:
```json
{
  "ok": true,
  "data": {
    "revoked": true
  }
}
```

## 8.3 Настройки клиентского сайта
### `GET /settings/public`
Доступ: публичный.

Ответ `200`:
```json
{
  "ok": true,
  "data": {
    "clientCancelMinNoticeMinutes": 120,
    "clientCancelPolicy": {
      "minNoticeMinutes": 120
    },
    "privacyPolicy": {
      "content": "..."
    }
  }
}
```

### `GET /settings/staff`
Доступ: любой авторизованный staff.

Возвращает тот же payload, что и `GET /settings/public`.

### `PATCH /settings/client-cancel-policy`
Доступ: только `OWNER`.

Body:
```json
{
  "minNoticeMinutes": 120
}
```

`minNoticeMinutes` используется в `POST /client/appointments/:id/cancel`.

### `PATCH /settings/privacy-policy`
Доступ: `OWNER` или staff с permission `MANAGE_CLIENT_FRONT`.

Body:
```json
{
  "content": "..."
}
```

Возвращает тот же payload, что и `GET /settings/staff`.

## 8.4 Клиенты и лояльность

### `GET /clients?page=1&limit=50&search=...`
Доступ: `ADMIN|OWNER`.

### `GET /clients/:id`
Доступ: `ADMIN|OWNER`.

### `PATCH /clients/:id/discount`
Доступ: `OWNER` или `ADMIN` с permission `MANAGE_CLIENT_DISCOUNTS`.

Body:
```json
{
  "discount": {
    "mode": "PERMANENT",
    "type": "FIXED",
    "value": 300
  }
}
```

Или временная скидка:
```json
{
  "discount": {
    "mode": "TEMPORARY",
    "type": "PERCENT",
    "value": 15,
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-31T20:59:59.000Z"
  }
}
```

### `POST /clients/loyalty/upsert`
Доступ: `OWNER` или `ADMIN` с permission `MANAGE_CLIENT_DISCOUNTS`.

Upsert клиента по телефону и сразу назначение скидки.

### `GET /clients/loyalty/list?page=1&limit=50&search=...`
Доступ: `OWNER` или `ADMIN` с permission `MANAGE_CLIENT_DISCOUNTS`.

Отдаёт список клиентов с `discount.permanent` и `discount.temporary`.

## 8.5 Промокоды

### `GET /promocodes/validate?code=...&phone=...`
Публичный endpoint (можно использовать в клиентском UI и админке).

### `GET /promocodes?page=1&limit=50&search=...`
### `POST /promocodes`
### `PATCH /promocodes/:id`
### `POST /promocodes/:id/send`
Доступ к управлению: `OWNER` или `ADMIN` с permission `MANAGE_PROMOCODES`.

Промокод можно:
- сгенерировать автоматически (`generate=true`);
- ограничить по времени (`startsAt/endsAt`);
- ограничить по количеству использований (`maxUsages`, `perClientUsageLimit`);
- деактивировать (`isActive=false`).

`POST /promocodes/:id/send`:
- получатель задается одним из полей: `email` или `phone` или `clientId`;
- если передан `phone/clientId`, backend пытается взять email из `ClientAccount`;
- если SMTP не настроен, endpoint вернет `deliveryMode=DEV_LOG` и `preview` письма (для dev/test);
- если SMTP настроен, вернет `deliveryMode=SMTP` и `messageId`.

## 9. Сервисы, отчеты, импорт/экспорт

## 9.1 Список услуг
### `GET /services`
Доступ: `ADMIN`, `OWNER`.

Возвращает `items[]` с категориями и ценами.

## 9.2 Отчеты
### `GET /reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
Доступ: `ADMIN`, `OWNER`.

Базовый блок всегда:
- `appointmentsCount`
- `arrivedCount`
- `noShowCount`
- `cancelledCount`
- `byStaff[]`

Финансовый блок `money` появляется только если:
- роль `OWNER`, или
- у staff есть активный permission `VIEW_FINANCIAL_STATS`.

## 9.3 Импорт
- `POST /imports/clients`
- `POST /imports/services`
- `POST /imports/appointments`
- `POST /imports/schedule` (PDF график персонала)
- `GET /imports/:jobId`

Доступ: `ADMIN`, `OWNER`.

Формат upload:
- `multipart/form-data`
- file field name: `file`

## 9.4 Экспорт
- `GET /exports/clients.xlsx`
- `GET /exports/services.xlsx`
- `GET /exports/appointments.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD`

Доступ: `ADMIN`, `OWNER`.

## 10. Записи и слоты в staff-приложении

## 10.1 Слоты
`GET /appointments/slots` доступен без auth, но staff-app обычно вызывает под токеном.

Кандидаты staff для слотов и записи: только `isActive=true` и `firedAt=null`.
Уволенные сотрудники не видны в клиентском потоке бронирования.

## 10.2 Список записей (журнал)
### `GET /appointments?page=1&limit=50&from=YYYY-MM-DD&to=YYYY-MM-DD&staffId=...&status=...`
Доступ: `ADMIN`, `OWNER`.

Возвращает полную карточку записи (клиент, услуги, суммы, оплата) + pagination.

## 10.3 Создание записи
`POST /appointments`:
- доступно гостю/клиенту/staff;
- `discountOverride` только `ADMIN|OWNER`;
- `MASTER` не может override.
- можно передать `promoCode`;
- нельзя передавать одновременно `discountOverride` и `promoCode`.

## 10.4 Изменение статуса
### `PATCH /appointments/:id/status`
Доступ:
- `OWNER|ADMIN` — любой статус;
- `MASTER` — только `ARRIVED|NO_SHOW` и только свои записи.

## 10.5 Перенос записи
### `PATCH /appointments/:id/reschedule`
Доступ: `OWNER|ADMIN`.

Body:
```json
{
  "startAt": "2026-03-10T09:00:00.000Z",
  "staffId": "uuid",
  "anyStaff": false
}
```

Правила:
- шаг 10 минут;
- учитываются график, блоки, time-off, занятость;
- для `CANCELLED/NO_SHOW` перенос запрещен.

## 10.6 Оплаты записи
### `POST /appointments/:id/payments`
Доступ: `OWNER|ADMIN`.

Body:
```json
{
  "amount": 1500,
  "method": "CARD"
}
```

Создает `Payment` и пересчитывает `Appointment.paymentStatus` (`UNPAID|PARTIAL|PAID`).

### `GET /appointments/:id/payments`
Доступ: `OWNER|ADMIN`.

Возвращает историю платежей по записи.

## 10.7 Мои записи мастера
### `GET /master/appointments?page=1&limit=50&from=YYYY-MM-DD`
Доступ: `MASTER`.

Возвращает только свои текущие/будущие записи (по `startAt`), без телефонов и без финансов.

## 10.8 Карточка клиента для мастера
### `GET /master/clients/:clientId/summary`
Доступ: `MASTER`.

Ответ включает:
- `client: { id, name }`
- `visitsWithMe` (count ARRIVED к этому мастеру)
- `last14DaysAppointments` только визиты этого мастера за 14 дней

Телефона и сумм в ответе нет.

## 11. Расписание (CRUD)

## 11.1 Working Hours
- `GET /schedule/staff/:staffId/working-hours`
- `PUT /schedule/staff/:staffId/working-hours`

`PUT` делает полную замену интервалов, проверяет пересечения и `endTime > startTime`.
Если на дату загружен `daily schedule` через `POST /imports/schedule`, для этой даты используется он (приоритет над weekly working-hours).

## 11.2 Time Off
- `GET /schedule/staff/:staffId/time-off?from&to`
- `POST /schedule/staff/:staffId/time-off`
- `DELETE /schedule/time-off/:id`

## 11.3 Blocks
- `GET /schedule/staff/:staffId/blocks?from&to`
- `POST /schedule/staff/:staffId/blocks`
- `DELETE /schedule/blocks/:id`

Доступ к расписанию: `OWNER|ADMIN`.

## 12. Карта экранов staff app (реально покрываемых текущим API)

`OWNER/ADMIN`:
1. Login (phone+pin)
2. Import center (4 типа + job details)
3. Services list
4. Reports overview (для OWNER финансовый блок)
5. Staff list
6. Staff invite
7. Staff contact edit
8. Staff service assignment
9. Schedule management (working-hours/blocks/time-off)
10. Appointment journal + status/reschedule/payments
11. Loyalty page (поиск клиента, постоянная/временная скидка, upsert по телефону)
12. Promo codes (создание/редактирование/валидация/отправка email)
13. (OWNER only) role change / permissions / fire / cancel-policy

`MASTER`:
1. Login
2. Refresh/logout
3. Own appointments list
4. Create appointment (без discount override)
5. Client summary (последние 14 дней + visitsWithMe)

## 13. Ошибки и UX обработка

Обязательные кейсы:
- `401 AUTH_REQUIRED`: токен истек/невалиден -> re-login.
- `403 FORBIDDEN`: скрывать/дизейблить недоступные действия по роли.
- `404 NOT_FOUND`: устаревший id в форме.
- `409 CONFLICT`: phone/email/прочие unique конфликты.
- `409 CONFLICT_TIME_SLOT`: слот занят/недоступен.
- `422 STAFF_HAS_FUTURE_APPOINTMENTS`: показать count и подсказку по переносу/отмене.

## 14. Примеры curl для frontend интеграции

```bash
curl -X POST http://localhost:3000/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+7 978 677-81-30","pin":"1234"}'
```

```bash
curl -X POST http://localhost:3000/staff/invite \
  -H "Authorization: Bearer <OWNER_OR_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+7 978 318-89-83","email":"menzatova29@icloud.com","name":"Амаля","role":"MASTER","positionName":"Мастер маникюра/педикюра"}'
```

```bash
curl -X PATCH http://localhost:3000/staff/<staffId>/contact \
  -H "Authorization: Bearer <OWNER_OR_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+7 978 318-89-83","name":"Амаля","email":"menzatova29@icloud.com","positionName":"Мастер маникюра/педикюра"}'
```

```bash
curl -X PUT http://localhost:3000/staff/<staffId>/services \
  -H "Authorization: Bearer <OWNER_OR_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"serviceIds":["serviceUuid1","serviceUuid2"]}'
```

```bash
curl "http://localhost:3000/reports/overview?from=2026-03-01&to=2026-03-31" \
  -H "Authorization: Bearer <ADMIN_OR_OWNER_ACCESS_TOKEN>"
```

```bash
curl -X POST http://localhost:3000/promocodes/<promoId>/send \
  -H "Authorization: Bearer <OWNER_OR_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+7 978 677-81-30"}'
```
