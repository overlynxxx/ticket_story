# Backend API для продажи билетов

Backend сервер для обработки платежей через ЮКассу.

## Установка

```bash
cd backend
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. Отредактируйте `.env` и укажите ваши ключи ЮКассы:
```
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
PORT=3001
RETURN_URL=http://localhost:3000/payment-success
```

## Запуск

### Режим разработки (с автоперезагрузкой):
```bash
npm run dev
```

### Продакшен:
```bash
npm start
```

Сервер будет доступен на `http://localhost:3001`

## API Endpoints

### GET /api/health
Проверка работоспособности сервера

### GET /api/events
Получение списка мероприятий из конфига

### POST /api/create-payment
Создание платежа в ЮКассе

**Тело запроса:**
```json
{
  "amount": 1000,
  "eventId": "live-in-tupik-2025-01-16",
  "categoryId": "economy",
  "quantity": 1,
  "userId": "123456789"
}
```

**Ответ:**
```json
{
  "success": true,
  "paymentId": "payment_id",
  "confirmationUrl": "https://...",
  "qrCode": "qr_code_data",
  "amount": 1000
}
```

### GET /api/payment/:paymentId/status
Проверка статуса платежа

**Ответ:**
```json
{
  "success": true,
  "status": "succeeded",
  "paid": true,
  "ticketId": "TICKET-..."
}
```

### POST /api/payment-webhook
Webhook от ЮКассы (настройте в личном кабинете)

### GET /api/ticket/:ticketId
Получение информации о билете

## Настройка Webhook

1. Зайдите в личный кабинет ЮКассы
2. Перейдите в настройки магазина
3. Укажите URL webhook: `https://your-domain.com/api/payment-webhook`
4. Для локальной разработки используйте ngrok:
```bash
ngrok http 3001
```

## Структура проекта

```
backend/
├── server.js          # Основной файл сервера
├── package.json       # Зависимости
├── .env.example       # Пример конфигурации
├── .env               # Ваши настройки (не в git)
└── README.md          # Документация
```

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте `.env` файл в git
- Используйте переменные окружения для ключей
- В продакшене используйте HTTPS
- Валидируйте все входящие данные

## Использование с фронтендом

Обновите `src/pages/Payment.jsx` для работы с вашим API:

```javascript
const response = await fetch('http://localhost:3001/api/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: totalPrice,
    eventId: eventId,
    categoryId: categoryId,
    quantity: quantity,
    userId: webApp?.initDataUnsafe?.user?.id
  })
})
```
