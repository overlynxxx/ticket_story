/**
 * ПРИМЕР БЭКЕНД КОДА ДЛЯ ИНТЕГРАЦИИ С ЮКАССОЙ
 * 
 * ВАЖНО: Этот код должен работать на вашем сервере, а не в клиентском приложении!
 * Используйте Node.js + Express или любой другой фреймворк
 */

// Пример с использованием Express и yookassa-sdk
const express = require('express');
const { YooCheckout } = require('@a2seven/yoo-checkout');
const app = express();

app.use(express.json());

// Инициализация ЮКассы
const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY,
});

// Создание платежа
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, ticketCategory, quantity, userId } = req.body;

    // Создаем платеж в ЮКассе
    const payment = await checkout.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'qr',
        return_url: 'https://your-app.com/payment-success',
      },
      capture: true,
      description: `Билет ${ticketCategory} × ${quantity}`,
      metadata: {
        ticketCategory,
        quantity,
        userId,
      },
    });

    // Сохраняем платеж в БД (пример)
    // await db.payments.create({
    //   paymentId: payment.id,
    //   userId,
    //   amount,
    //   status: 'pending',
    //   ticketCategory,
    //   quantity,
    // });

    res.json({
      success: true,
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url,
      qrCode: payment.confirmation.confirmation_data, // QR код для оплаты
    });
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook от ЮКассы (обработка уведомлений о платежах)
app.post('/api/payment-webhook', async (req, res) => {
  try {
    const { event, object } = req.body;

    if (event === 'payment.succeeded') {
      const { id, amount, metadata, status } = object;

      // Проверяем подпись (важно для безопасности!)
      // const isValid = checkout.verifyWebhookSignature(req.headers, req.body);
      // if (!isValid) return res.status(400).send('Invalid signature');

      // Обновляем статус платежа в БД
      // await db.payments.update(
      //   { status: 'succeeded' },
      //   { where: { paymentId: id } }
      // );

      // Создаем билеты
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // await db.tickets.create({
      //   ticketId,
      //   userId: metadata.userId,
      //   category: metadata.ticketCategory,
      //   quantity: metadata.quantity,
      //   paymentId: id,
      //   status: 'active',
      // });

      // Отправляем уведомление пользователю (через Telegram Bot API)
      // await sendTelegramNotification(metadata.userId, ticketId);

      console.log(`Платеж ${id} успешно обработан, создан билет ${ticketId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).send('Error');
  }
});

// Проверка статуса платежа
app.get('/api/payment/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Получаем информацию о платеже из ЮКассы
    const payment = await checkout.getPayment(paymentId);

    res.json({
      success: true,
      status: payment.status,
      paid: payment.paid,
    });
  } catch (error) {
    console.error('Ошибка проверки платежа:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение билета
app.get('/api/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Получаем билет из БД
    // const ticket = await db.tickets.findOne({ where: { ticketId } });
    
    // if (!ticket) {
    //   return res.status(404).json({ success: false, error: 'Билет не найден' });
    // }

    // res.json({ success: true, ticket });
    
    // Пример ответа
    res.json({
      success: true,
      ticket: {
        id: ticketId,
        // ... другие данные билета
      },
    });
  } catch (error) {
    console.error('Ошибка получения билета:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

/**
 * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
 * 
 * 1. Установите зависимости:
 *    npm install express @a2seven/yoo-checkout
 * 
 * 2. Создайте .env файл:
 *    YOOKASSA_SHOP_ID=your_shop_id
 *    YOOKASSA_SECRET_KEY=your_secret_key
 * 
 * 3. Настройте webhook в личном кабинете ЮКассы:
 *    URL: https://your-domain.com/api/payment-webhook
 * 
 * 4. Обновите фронтенд код в Payment.jsx:
 *    - Замените симуляцию на реальный запрос к /api/create-payment
 *    - Добавьте проверку статуса платежа через /api/payment/:paymentId/status
 *    - После успешной оплаты перенаправляйте на /ticket/:ticketId
 */
