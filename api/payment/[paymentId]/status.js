import { YooCheckout } from '@a2seven/yoo-checkout';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] [${new Date().toISOString()}] payment-status: ${req.method} ${req.url}`);
  console.log(`[${requestId}] Query params:`, req.query);
  console.log(`[${requestId}] Headers:`, {
    origin: req.headers.origin,
    host: req.headers.host,
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  });

  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS request, returning 200`);
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // В Vercel динамические параметры доступны через req.query
    // Но также проверяем URL напрямую для надежности
    const paymentId = req.query.paymentId || 
                     req.url?.match(/\/payment\/([^\/]+)\/status/)?.[1] ||
                     req.url?.split('/').filter(Boolean).find((part, i, arr) => arr[i-1] === 'payment');
    
    console.log(`[${requestId}] Checking payment status for: ${paymentId}`);
    console.log(`[${requestId}] Full request details:`, {
      url: req.url,
      query: req.query,
      method: req.method,
      path: req.url?.split('?')[0]
    });

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
    console.log(`[${requestId}] Fetching payment from YooKassa...`);
    const payment = await checkout.getPayment(paymentId);
    console.log(`[${requestId}] Payment status from YooKassa:`, {
      id: payment.id,
      status: payment.status,
      paid: payment.paid,
      hasMetadata: !!payment.metadata
    });

    // Если платеж успешен, создаем билеты
    let ticketIds = [];
    if (payment.status === 'succeeded' && payment.metadata) {
      const quantity = parseInt(payment.metadata.quantity || '1');
      // Создаем отдельный билет для каждого купленного билета
      // Используем timestamp и случайные строки для уникальности
      const baseTimestamp = Date.now();
      for (let i = 0; i < quantity; i++) {
        const randomStr = Math.random().toString(36).substr(2, 9);
        const ticketId = `TICKET-${baseTimestamp}-${randomStr}-${i}`;
        ticketIds.push(ticketId);
      }
      console.log(`[${requestId}] Generated ${ticketIds.length} tickets for payment ${paymentId}:`, ticketIds);
      // В продакшене здесь нужно сохранить билеты в БД
    }

    const responseData = {
      success: true,
      status: payment.status,
      paid: payment.paid,
      ticketId: ticketIds[0] || null, // Первый билет для обратной совместимости
      ticketIds: ticketIds, // Все билеты
      metadata: payment.metadata // Передаем metadata для создания билетов
    };
    console.log(`[${requestId}] Sending response:`, { ...responseData, ticketIds: ticketIds.length });
    res.json(responseData);
  } catch (error) {
    console.error('Ошибка проверки платежа:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка проверки платежа'
    });
  }
}
