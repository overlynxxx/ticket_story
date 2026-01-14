import { YooCheckout } from '@a2seven/yoo-checkout';

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] [${new Date().toISOString()}] payment-webhook: ${req.method} ${req.url}`);
  console.log(`[${requestId}] Headers:`, {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  });

  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log(`[${requestId}] Webhook event:`, {
      event: event.event,
      objectId: event.object?.id,
      objectStatus: event.object?.status
    });

    if (event.event === 'payment.succeeded') {
      const payment = event.object;
      const paymentId = payment.id;

      // В продакшене здесь нужно:
      // 1. Проверить подпись webhook (используя HTTP_AUTHORIZATION header)
      // 2. Сохранить билет в БД
      // 3. Отправить уведомление пользователю

      console.log(`[${requestId}] Payment ${paymentId} succeeded!`);
      console.log(`[${requestId}] Payment metadata:`, payment.metadata);
      
      // Создаем билеты
      if (payment.metadata && payment.metadata.quantity) {
        const quantity = parseInt(payment.metadata.quantity || '1');
        const ticketIds = [];
        for (let i = 0; i < quantity; i++) {
          const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;
          ticketIds.push(ticketId);
        }
        console.log(`[${requestId}] Generated ${ticketIds.length} tickets:`, ticketIds);
        // Сохранить в БД: ticketIds, paymentId, metadata и т.д.
      }
    } else if (event.event === 'payment.canceled') {
      console.log(`[${requestId}] Payment ${event.object?.id} was canceled`);
    } else {
      console.log(`[${requestId}] Unknown webhook event: ${event.event}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error(`[${requestId}] Ошибка обработки webhook:`, {
      message: error.message,
      stack: error.stack
    });
    res.status(500).send('Error');
  }
}
