import { YooCheckout } from '@a2seven/yoo-checkout';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID required'
      });
    }

    // Загружаем конфиг
    let eventsConfig = {};
    try {
      const configPath = join(process.cwd(), 'config', 'tickets.json');
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

    // Получаем информацию о платеже из ЮКассы
    const payment = await checkout.getPayment(paymentId);

    // Если платеж успешен, создаем билет
    let ticketId = null;
    if (payment.status === 'succeeded' && payment.metadata) {
      ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // В продакшене здесь нужно сохранить билет в БД
    }

    res.json({
      success: true,
      status: payment.status,
      paid: payment.paid,
      ticketId: ticketId
    });
  } catch (error) {
    console.error('Ошибка проверки платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка проверки платежа'
    });
  }
}
