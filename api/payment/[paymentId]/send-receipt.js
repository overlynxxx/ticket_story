import { readFileSync } from 'fs';
import { join } from 'path';
import { YooCheckout } from '@a2seven/yoo-checkout';

// Функция для отправки информационного чека через Resend
async function sendReceiptViaResend(payment, event, category, requestId) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM || 'Tickets <noreply@ticket-story.com>';
  const email = payment.metadata?.email;

  if (!RESEND_API_KEY || !email) {
    console.log(`[${requestId}] ⏭️ Пропускаем отправку чека:`, {
      hasResendKey: !!RESEND_API_KEY,
      hasEmail: !!email
    });
    return { success: false, reason: 'missing_config' };
  }

  const amount = parseFloat(payment.amount.value);
  const quantity = parseInt(payment.metadata?.quantity || '1');
  const paymentDate = new Date(payment.created_at || Date.now()).toLocaleString('ru-RU');

  try {
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #00a8ff; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #00a8ff; margin: 0; font-size: 28px; }
          .receipt-info { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #666; }
          .info-value { color: #333; }
          .items-section { margin: 30px 0; }
          .item { padding: 15px; background: #f9f9f9; border-radius: 6px; margin-bottom: 10px; }
          .item-name { font-weight: bold; font-size: 16px; color: #00a8ff; margin-bottom: 8px; }
          .item-details { color: #666; font-size: 14px; }
          .total-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #00a8ff; }
          .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; padding: 10px 0; }
          .total-label { color: #333; }
          .total-value { color: #00a8ff; font-size: 24px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Чек об оплате</h1>
            <p style="color: #666; margin: 5px 0;">Информационный документ</p>
          </div>

          <div class="receipt-info">
            <div class="info-row">
              <span class="info-label">Номер платежа:</span>
              <span class="info-value">${payment.id}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Дата и время:</span>
              <span class="info-value">${paymentDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Статус:</span>
              <span class="info-value" style="color: #28a745; font-weight: bold;">Оплачено</span>
            </div>
          </div>

          <div class="items-section">
            <h2 style="color: #333; margin-bottom: 15px;">Товары и услуги:</h2>
            <div class="item">
              <div class="item-name">${event?.name || 'Мероприятие'}</div>
              <div class="item-details">
                <div>Категория: ${category?.name || 'Не указана'}</div>
                <div>Количество: ${quantity} шт.</div>
                <div>Цена за единицу: ${(amount / quantity).toFixed(2)} ₽</div>
              </div>
            </div>
          </div>

          <div class="total-section">
            <div class="total-row">
              <span class="total-label">Итого к оплате:</span>
              <span class="total-value">${amount.toFixed(2)} ₽</span>
            </div>
          </div>

          ${event ? `
          <div class="receipt-info" style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-radius: 6px;">
            <h3 style="color: #00a8ff; margin-top: 0;">Информация о мероприятии:</h3>
            <div class="info-row" style="border: none;">
              <span class="info-label">Название:</span>
              <span class="info-value">${event.name}</span>
            </div>
            ${event.date ? `
            <div class="info-row" style="border: none;">
              <span class="info-label">Дата:</span>
              <span class="info-value">${event.date}</span>
            </div>
            ` : ''}
            ${event.time ? `
            <div class="info-row" style="border: none;">
              <span class="info-label">Время:</span>
              <span class="info-value">${event.time}</span>
            </div>
            ` : ''}
            ${event.venue ? `
            <div class="info-row" style="border: none;">
              <span class="info-label">Место:</span>
              <span class="info-value">${event.venue}</span>
            </div>
            ` : ''}
            ${event.address ? `
            <div class="info-row" style="border: none;">
              <span class="info-label">Адрес:</span>
              <span class="info-value">${event.address}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p>Это информационный чек. Для получения фискального чека обратитесь в поддержку.</p>
            <p>ООО "НЕВА ПУЛЬС" | ИНН: 7814854075</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: `Чек об оплате №${payment.id}`,
        html: receiptHtml
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => ({}));
      console.error(`[${requestId}] ❌ Ошибка отправки чека:`, {
        status: emailResponse.status,
        error: errorData
      });
      return { success: false, error: errorData };
    }

    const emailData = await emailResponse.json();
    console.log(`[${requestId}] ✅ Чек отправлен на email:`, {
      emailId: emailData.id,
      to: email,
      paymentId: payment.id
    });

    return { success: true, emailId: emailData.id };
  } catch (error) {
    console.error(`[${requestId}] ❌ Ошибка отправки чека:`, {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] [${new Date().toISOString()}] send-receipt: ${req.method} ${req.url}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Требуется paymentId'
      });
    }

    // Загружаем конфиг
    let eventsConfig = {};
    try {
      const configPath = join(process.cwd(), 'config', 'tickets.json');
      const configData = readFileSync(configPath, 'utf8');
      eventsConfig = JSON.parse(configData);
    } catch (error) {
      console.error(`[${requestId}] Ошибка загрузки конфига:`, error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка загрузки конфигурации'
      });
    }

    // Получаем информацию о платеже из ЮКассы
    const shopId = process.env.YOOKASSA_SHOP_ID || eventsConfig.yookassa?.shopId;
    const secretKey = process.env.YOOKASSA_SECRET_KEY || eventsConfig.yookassa?.secretKey;

    if (!shopId || !secretKey) {
      return res.status(500).json({
        success: false,
        error: 'Не настроены ключи ЮКассы'
      });
    }

    const checkout = new YooCheckout({ shopId, secretKey });
    const payment = await checkout.getPayment(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Платеж не найден'
      });
    }

    // Находим мероприятие
    const eventId = payment.metadata?.eventId;
    const categoryId = payment.metadata?.categoryId;
    const event = eventsConfig.events?.find(e => e.id === eventId);
    const category = event?.ticketCategories?.find(c => c.id === categoryId);

    // Отправляем чек
    const result = await sendReceiptViaResend(payment, event, category, requestId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Чек отправлен на email',
        emailId: result.emailId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Ошибка отправки чека'
      });
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Ошибка обработки запроса:`, {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка обработки запроса'
    });
  }
}
