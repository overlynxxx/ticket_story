import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Загружаем конфиг мероприятий
const configPath = join(__dirname, '..', 'config', 'tickets.json');
let eventsConfig = {};
try {
  const configData = readFileSync(configPath, 'utf8');
  eventsConfig = JSON.parse(configData);
} catch (error) {
  console.error('Ошибка загрузки конфига:', error);
}

// Инициализация ЮКассы
const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID || eventsConfig.yookassa?.shopId,
  secretKey: process.env.YOOKASSA_SECRET_KEY || eventsConfig.yookassa?.secretKey,
});

// Хранилище платежей (в продакшене используйте БД)
const payments = new Map();
const tickets = new Map();

// Получение конфига мероприятий
app.get('/api/events', (req, res) => {
  try {
    res.json({
      success: true,
      events: eventsConfig.events || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Создание платежа
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, eventId, categoryId, quantity, userId } = req.body;

    // Валидация
    if (!amount || !eventId || !categoryId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных для создания платежа'
      });
    }

    // Находим мероприятие и категорию
    const event = eventsConfig.events?.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Мероприятие не найдено'
      });
    }

    const category = event.ticketCategories?.find(c => c.id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Категория билетов не найдена'
      });
    }

    // Проверяем цену
    const expectedPrice = category.price * quantity;
    if (Math.abs(amount - expectedPrice) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Неверная сумма платежа'
      });
    }

    // Если цена 0, сразу создаем билет
    if (amount === 0) {
      const ticketId = `TICKET-${Date.now()}-${uuidv4().substr(0, 8)}`;
      const ticket = {
        id: ticketId,
        eventId,
        categoryId,
        quantity,
        userId: userId || 'anonymous',
        amount: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      tickets.set(ticketId, ticket);

      return res.json({
        success: true,
        ticketId: ticketId,
        free: true
      });
    }

    // Создаем платеж в ЮКассе
    const idempotenceKey = uuidv4();
    const payment = await checkout.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'qr',
        return_url: process.env.RETURN_URL || `${req.protocol}://${req.get('host')}/payment-success`,
      },
      capture: true,
      description: `Билеты: ${event.name} - ${category.name} × ${quantity}`,
      metadata: {
        eventId,
        categoryId,
        quantity: quantity.toString(),
        userId: userId || 'anonymous',
        eventName: event.name,
        categoryName: category.name
      },
    }, idempotenceKey);

    // Сохраняем платеж
    const paymentData = {
      id: payment.id,
      status: payment.status,
      amount,
      eventId,
      categoryId,
      quantity,
      userId: userId || 'anonymous',
      createdAt: new Date().toISOString(),
      payment: payment
    };
    payments.set(payment.id, paymentData);

    res.json({
      success: true,
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
      qrCode: payment.confirmation?.confirmation_data,
      amount: amount
    });
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка создания платежа'
    });
  }
});

// Проверка статуса платежа
app.get('/api/payment/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Получаем информацию о платеже из ЮКассы
    const payment = await checkout.getPayment(paymentId);

    // Обновляем статус в хранилище
    const paymentData = payments.get(paymentId);
    if (paymentData) {
      paymentData.status = payment.status;
      paymentData.payment = payment;
      payments.set(paymentId, paymentData);

      // Если платеж успешен, создаем билет
      if (payment.status === 'succeeded' && paymentData.status !== 'ticket_created') {
        const ticketId = `TICKET-${Date.now()}-${uuidv4().substr(0, 8)}`;
        const ticket = {
          id: ticketId,
          eventId: paymentData.eventId,
          categoryId: paymentData.categoryId,
          quantity: paymentData.quantity,
          userId: paymentData.userId,
          paymentId: paymentId,
          amount: paymentData.amount,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        tickets.set(ticketId, ticket);
        paymentData.status = 'ticket_created';
        paymentData.ticketId = ticketId;
        payments.set(paymentId, paymentData);
      }
    }

    res.json({
      success: true,
      status: payment.status,
      paid: payment.paid,
      ticketId: paymentData?.ticketId || null
    });
  } catch (error) {
    console.error('Ошибка проверки платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка проверки платежа'
    });
  }
});

// Webhook от ЮКассы
app.post('/api/payment-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.succeeded') {
      const payment = event.object;
      const paymentId = payment.id;

      // Получаем данные платежа
      const paymentData = payments.get(paymentId);
      if (paymentData && paymentData.status !== 'ticket_created') {
        // Создаем билет
        const ticketId = `TICKET-${Date.now()}-${uuidv4().substr(0, 8)}`;
        const ticket = {
          id: ticketId,
          eventId: paymentData.eventId,
          categoryId: paymentData.categoryId,
          quantity: paymentData.quantity,
          userId: paymentData.userId,
          paymentId: paymentId,
          amount: paymentData.amount,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        tickets.set(ticketId, ticket);

        // Обновляем статус платежа
        paymentData.status = 'ticket_created';
        paymentData.ticketId = ticketId;
        payments.set(paymentId, paymentData);

        console.log(`Платеж ${paymentId} успешно обработан, создан билет ${ticketId}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).send('Error');
  }
});

// Получение билета
app.get('/api/ticket/:ticketId', (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = tickets.get(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Билет не найден'
      });
    }

    // Находим мероприятие
    const event = eventsConfig.events?.find(e => e.id === ticket.eventId);
    const category = event?.ticketCategories?.find(c => c.id === ticket.categoryId);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        event: event ? {
          name: event.name,
          date: event.date,
          time: event.time,
          venue: event.venue
        } : null,
        category: category ? {
          name: category.name,
          price: category.price
        } : null
      }
    });
  } catch (error) {
    console.error('Ошибка получения билета:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения билета'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}`);
  console.log(`🔑 ShopID: ${process.env.YOOKASSA_SHOP_ID || eventsConfig.yookassa?.shopId || 'не установлен'}`);
});
