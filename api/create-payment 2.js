import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, eventId, categoryId, quantity, userId } = req.body;

    // Валидация
    if (!amount || !eventId || !categoryId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных для создания платежа'
      });
    }

    // Загружаем конфиг мероприятий
    let eventsConfig = {};
    try {
      const configPath = join(process.cwd(), 'config', 'tickets.json');
      const configData = readFileSync(configPath, 'utf8');
      eventsConfig = JSON.parse(configData);
    } catch (error) {
      console.error('Ошибка загрузки конфига:', error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка загрузки конфигурации'
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
      return res.json({
        success: true,
        ticketId: ticketId,
        free: true
      });
    }

    // Инициализация ЮКассы
    const checkout = new YooCheckout({
      shopId: process.env.YOOKASSA_SHOP_ID || eventsConfig.yookassa?.shopId,
      secretKey: process.env.YOOKASSA_SECRET_KEY || eventsConfig.yookassa?.secretKey,
    });

    // Создаем платеж в ЮКассе
    const idempotenceKey = uuidv4();
    const payment = await checkout.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'qr',
        return_url: process.env.RETURN_URL || `${req.headers.origin || 'https://your-app.vercel.app'}/payment-success`,
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

    // Логируем ответ от ЮКассы для отладки
    console.log('YooKassa payment response:', {
      id: payment.id,
      status: payment.status,
      confirmation: payment.confirmation,
      confirmationUrl: payment.confirmation?.confirmation_url,
      confirmationData: payment.confirmation?.confirmation_data
    });

    // Для QR-кода используем confirmation_url или confirmation_data
    const qrCode = payment.confirmation?.confirmation_url || payment.confirmation?.confirmation_data;

    res.json({
      success: true,
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
      qrCode: qrCode,
      amount: amount
    });
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка создания платежа'
    });
  }
}
