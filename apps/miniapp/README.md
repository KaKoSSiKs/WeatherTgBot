# Weather Mini App

Mini-app для Telegram Web Apps (Vite + React + TS + Tailwind). Страницы: Места, Прогноз, Уведомления, Настройки.

## Запуск
```bash
pnpm i
pnpm -F weather-miniapp dev
```

## Структура
```
src/
  components/ (Header, Footer, TabNav, Location*, ForecastView, Notification*, SettingsPanel, Toast)
  pages/ (LocationsPage, ForecastPage, NotificationsPage, SettingsPage)
  services/ (api.ts, telegram.ts)
  utils/format.ts
  types.ts
```

## API контракт (ожидаемый backend)
- GET /api/locations -> Location[]
- POST /api/locations {name,lat,lon,country?} -> Location
- DELETE /api/locations/:id
- GET /api/forecast?lat&lon&units=metric|imperial -> Forecast
- GET /api/notifications -> Notification[]
- POST /api/notifications -> create
- PUT /api/notifications/:id -> update
- PATCH /api/notifications/:id/toggle {enabled:boolean}
- DELETE /api/notifications/:id
- POST /api/bot/sendAction {action,payload,initData}

## Telegram WebApp
- `window.Telegram.WebApp.ready()` вызывается в `services/telegram.ts`.
- initData пробрасывается в запросы к бэкенду (`sendActionToBot`).
- Deep link для открытия бота: `https://t.me/<bot_username>?start=miniapp`.

## E2E сценарии (кратко)
1) Добавить место -> открыть прогноз -> создать уведомление на ухудшение -> включить.
2) Добавить геолокацию -> сделать ежедневное напоминание 08:00 -> отключить.
3) Переключить единицы на Imperial и язык EN -> проверить отображение прогноза.

## Сборка/превью
```bash
pnpm -F weather-miniapp build
pnpm -F weather-miniapp preview
```
