# Инструкция по интеграции с ЮКассой

## Шаг 1: Настройка ЮКассы

1. Зарегистрируйтесь на [ЮКасса](https://yookassa.ru/)
2. Создайте магазин и получите:
   - `shopId` - ID магазина
   - `secretKey` - Секретный ключ

## Шаг 2: Настройка бэкенда

Смотрите пример кода в файле `backend-example.js`

### Основные эндпоинты:

1. **POST /api/create-payment** - Создание платежа
   ```json
   {
     "amount": 1000,
     "ticketCategory": "economy",
     "quantity": 1,
     "userId": "123456789"
   }
   ```

2. **POST /api/payment-webhook** - Webhook от ЮКассы
   - Настройте URL в личном кабинете ЮКассы
   - URL должен быть доступен из интернета (используйте ngrok для разработки)

3. **GET /api/payment/:paymentId/status** - Проверка статуса платежа

4. **GET /api/ticket/:ticketId** - Получение билета

## Шаг 3: Обновление фронтенда

В файле `src/pages/Payment.jsx` замените демо-код на реальные запросы к API:

```javascript
const response = await fetch('https://your-api.com/api/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: totalPrice,
    ticketCategory: categoryId,
    quantity: quantity,
    userId: webApp?.initDataUnsafe?.user?.id
  })
})

const data = await response.json()

if (data.success && data.qrCode) {
  // Покажите QR код пользователю
  // После оплаты проверяйте статус
}
```

## Шаг 4: Безопасность

⚠️ **КРИТИЧЕСКИ ВАЖНО:**

1. **Никогда не храните секретные ключи в клиентском коде!**
   - Все платежи должны проходить через ваш бэкенд
   - Используйте переменные окружения для хранения ключей

2. **Проверяйте подпись webhook'ов от ЮКассы**
   - Это защищает от поддельных уведомлений

3. **Валидируйте платежи на сервере**
   - Не выдавайте билеты до подтверждения оплаты
   - Проверяйте сумму и другие параметры

4. **Используйте HTTPS**
   - Обязательно в продакшене

## Шаг 5: Тестирование

1. Используйте тестовые данные ЮКассы для разработки
2. Проверьте все сценарии:
   - Успешная оплата
   - Отмена оплаты
   - Ошибка платежа
   - Повторная оплата

## Полезные ссылки

- [Документация ЮКассы](https://yookassa.ru/developers/api)
- [Примеры интеграции](https://yookassa.ru/developers/using-api/basics)
- [Webhook документация](https://yookassa.ru/developers/using-api/webhooks)
