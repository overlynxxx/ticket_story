import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

// Функция для генерации PDF билета
async function generateTicketPDF(ticketId, event, category, qrCodeBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [400, 600],
        margin: 30
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Заголовок
      doc.fontSize(24)
         .fillColor('#00a8ff')
         .text(event?.name || 'Мероприятие', { align: 'center' });
      
      doc.moveDown(1);
      
      // Информация о мероприятии
      doc.fontSize(12)
         .fillColor('#333');
      
      if (event?.date) {
        doc.text(`Дата: ${event.date}`, { align: 'left' });
      }
      if (event?.time) {
        doc.text(`Время: ${event.time}`, { align: 'left' });
      }
      if (event?.venue) {
        doc.text(`Место: ${event.venue}`, { align: 'left' });
      }
      if (event?.address) {
        doc.text(`Адрес: ${event.address}`, { align: 'left' });
      }
      if (category) {
        doc.text(`Категория: ${category.name}`, { align: 'left' });
      }
      
      doc.moveDown(1);
      
      // ID билета
      doc.fontSize(10)
         .fillColor('#666')
         .text(`ID билета: ${ticketId}`, { align: 'left' });
      
      doc.moveDown(2);
      
      // QR-код (центрируем)
      const qrSize = 150;
      const pageWidth = doc.page.width;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = doc.y;
      
      doc.image(qrCodeBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
        align: 'center'
      });
      
      doc.moveDown(2);
      
      // Инструкция
      doc.fontSize(10)
         .fillColor('#666')
         .text('Предъявите этот билет на входе.', { align: 'center' });
      doc.text('QR-код содержит информацию о билете.', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] [${new Date().toISOString()}] send-email: ${req.method} ${req.url}`);

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
    const { ticketId, email, eventId, categoryId } = req.body;

    if (!ticketId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Требуются ticketId и email'
      });
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат email'
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
    }

    // Находим мероприятие
    const event = eventsConfig.events?.find(e => e.id === eventId);
    const category = event?.ticketCategories?.find(c => c.id === categoryId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Мероприятие не найдено'
      });
    }

    // Здесь должна быть интеграция с email сервисом
    // Пример с использованием Resend API (нужно добавить RESEND_API_KEY в переменные окружения)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Tickets <noreply@ticket-story.com>';

    console.log(`[${requestId}] Email sending config:`, {
      hasResendKey: !!RESEND_API_KEY,
      resendKeyLength: RESEND_API_KEY?.length || 0,
      resendKeyPrefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + '...' : 'none',
      emailFrom: EMAIL_FROM,
      targetEmail: email?.substring(0, 20) + '...',
      ticketId: ticketId
    });

    if (!RESEND_API_KEY) {
      console.error(`[${requestId}] ❌ RESEND_API_KEY не настроен!`);
      return res.status(500).json({
        success: false,
        error: 'Email сервис не настроен. Обратитесь в поддержку.',
        ticketId: ticketId
      });
    }

    // Генерируем QR-код для билета (два варианта для максимальной совместимости)
    const qrCodeBuffer = await QRCode.toBuffer(ticketId, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 200,
      margin: 2
    });
    const qrCodeBase64 = qrCodeBuffer.toString('base64');
    const qrCodeDataUrl = `data:image/png;base64,${qrCodeBase64}`;
    const qrCodeCid = `qr-${ticketId.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    // Генерируем PDF билета
    let ticketPDFBase64 = null;
    try {
      const ticketPDFBuffer = await generateTicketPDF(ticketId, event, category, qrCodeBuffer);
      ticketPDFBase64 = ticketPDFBuffer.toString('base64');
      console.log(`[${requestId}] ✅ PDF билета сгенерирован для ${ticketId}, размер: ${ticketPDFBuffer.length} байт`);
    } catch (pdfError) {
      console.error(`[${requestId}] ❌ Ошибка генерации PDF для ${ticketId}:`, {
        message: pdfError.message,
        stack: pdfError.stack
      });
      // Продолжаем без PDF, отправляем только HTML
    }
    
    const attachments = [
      {
        filename: `qr-${ticketId}.png`,
        content: qrCodeBase64,
        cid: qrCodeCid
      }
    ];
    
    // Добавляем PDF билета как attachment, если он был успешно сгенерирован
    if (ticketPDFBase64) {
      attachments.push({
        filename: `Билет-${ticketId}.pdf`,
        content: ticketPDFBase64
      });
    }

    // Отправка email через Resend API
    const emailPayload = {
      from: EMAIL_FROM,
      to: email,
      subject: `Билет на мероприятие: ${event.name}`,
      html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .ticket { background: #f5f5f5; border: 2px solid #00a8ff; border-radius: 12px; padding: 20px; margin: 20px 0; }
              .ticket-header { text-align: center; margin-bottom: 20px; }
              .ticket-title { font-size: 24px; font-weight: bold; color: #00a8ff; }
              .ticket-info { margin: 10px 0; }
              .ticket-label { font-weight: bold; }
              .ticket-id { font-family: monospace; background: #fff; padding: 5px 10px; border-radius: 4px; }
              .qr-code { text-align: center; margin: 20px 0; }
              .qr-code img { max-width: 200px; height: auto; border: 2px solid #00a8ff; border-radius: 8px; padding: 10px; background: white; display: block; margin: 0 auto; }
              .pdf-notice { background: #e3f2fd; border-left: 4px solid #00a8ff; padding: 12px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Ваш билет</h1>
              ${ticketPDFBase64 ? '<div class="pdf-notice"><strong>📎 Полный билет в формате PDF прикреплен к письму.</strong></div>' : ''}
              <div class="ticket">
                <div class="ticket-header">
                  <div class="ticket-title">${event.name}</div>
                </div>
                <div class="ticket-info">
                  <span class="ticket-label">Мероприятие:</span> ${event.name}
                </div>
                <div class="ticket-info">
                  <span class="ticket-label">Дата:</span> ${event.date}
                </div>
                <div class="ticket-info">
                  <span class="ticket-label">Время:</span> ${event.time}
                </div>
                <div class="ticket-info">
                  <span class="ticket-label">Место:</span> ${event.venue}
                </div>
                ${event.address ? `<div class="ticket-info"><span class="ticket-label">Адрес:</span> ${event.address}</div>` : ''}
                ${category ? `<div class="ticket-info"><span class="ticket-label">Категория:</span> ${category.name}</div>` : ''}
                <div class="ticket-info">
                  <span class="ticket-label">ID билета:</span>
                  <span class="ticket-id">${ticketId}</span>
                </div>
                <div class="qr-code">
                  <!-- Пробуем CID (для современных клиентов), если не работает - показывается base64 fallback -->
                  <img src="cid:${qrCodeCid}" 
                       onerror="this.onerror=null; this.src='${qrCodeDataUrl}'" 
                       alt="QR Code для билета ${ticketId}" />
                </div>
              </div>
              <p>Предъявите этот билет на входе. QR-код содержит информацию о билете.</p>
            </div>
          </body>
          </html>
        `,
      attachments: attachments
    };

    console.log(`[${requestId}] Sending email via Resend API:`, {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log(`[${requestId}] Resend API response:`, {
      status: emailResponse.status,
      statusText: emailResponse.statusText,
      ok: emailResponse.ok,
      headers: Object.fromEntries(emailResponse.headers.entries())
    });

    if (!emailResponse.ok) {
      let errorData = {};
      try {
        errorData = await emailResponse.json();
      } catch (jsonError) {
        try {
          const text = await emailResponse.text();
          errorData = { rawError: text };
        } catch (textError) {
          errorData = { rawError: 'Unknown error' };
        }
      }
      console.error(`[${requestId}] ❌ Ошибка отправки email:`, {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: errorData
      });
      throw new Error(`Не удалось отправить email: ${errorData.message || errorData.rawError || 'Unknown error'}`);
    }

    const emailData = await emailResponse.json();
    console.log(`[${requestId}] ✅ Email отправлен успешно:`, {
      id: emailData.id,
      from: emailData.from,
      to: emailData.to,
      createdAt: emailData.created_at
    });

    res.status(200).json({
      success: true,
      message: 'Билет отправлен на email',
      ticketId: ticketId
    });

  } catch (error) {
    console.error(`[${requestId}] Ошибка отправки билета на email:`, {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка отправки email'
    });
  }
}
