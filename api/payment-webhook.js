import { YooCheckout } from '@a2seven/yoo-checkout';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event === 'payment.succeeded') {
      const payment = event.object;
      const paymentId = payment.id;

      // В продакшене здесь нужно:
      // 1. Проверить подпись webhook
      // 2. Сохранить билет в БД
      // 3. Отправить уведомление пользователю

      console.log(`Платеж ${paymentId} успешно обработан`);
      
      // Создаем билет
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Сохранить в БД: ticketId, paymentId, metadata и т.д.
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).send('Error');
  }
}
