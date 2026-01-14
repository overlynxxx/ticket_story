import { YooCheckout } from '@a2seven/yoo-checkout';
import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Асинхронная функция для отправки информационного чека через Resend
async function sendReceiptAsync(payment, event, category, requestId) {
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

  try {
    const amount = parseFloat(payment.amount.value);
    const quantity = parseInt(payment.metadata?.quantity || '1');
    const paymentDate = new Date(payment.created_at || Date.now()).toLocaleString('ru-RU');

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
            ${event.date ? `<div class="info-row" style="border: none;"><span class="info-label">Дата:</span><span class="info-value">${event.date}</span></div>` : ''}
            ${event.time ? `<div class="info-row" style="border: none;"><span class="info-label">Время:</span><span class="info-value">${event.time}</span></div>` : ''}
            ${event.venue ? `<div class="info-row" style="border: none;"><span class="info-label">Место:</span><span class="info-value">${event.venue}</span></div>` : ''}
            ${event.address ? `<div class="info-row" style="border: none;"><span class="info-label">Адрес:</span><span class="info-value">${event.address}</span></div>` : ''}
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

// Функция для генерации PDF билета с поддержкой кириллицы
async function generateTicketPDF(ticketId, event, category, qrCodeBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [400, 600],
        margin: 40,
        autoFirstPage: true,
        info: {
          Title: 'Билет',
          Author: 'Ticket Story',
          Subject: 'Билет на мероприятие',
          Keywords: 'билет, ticket'
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Загружаем шрифт с поддержкой кириллицы из CDN
      // Используем Roboto Regular, который поддерживает кириллицу
      let fontRegistered = false;
      try {
        const fontUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf';
        const fontResponse = await fetch(fontUrl);
        if (fontResponse.ok) {
          const fontBuffer = Buffer.from(await fontResponse.arrayBuffer());
          doc.registerFont('Roboto', fontBuffer);
          doc.font('Roboto');
          fontRegistered = true;
          console.log('✅ Шрифт Roboto загружен и зарегистрирован');
        }
      } catch (fontError) {
        console.warn('⚠️ Не удалось загрузить шрифт Roboto, используем стандартный:', fontError.message);
        // Продолжаем без кастомного шрифта
      }
      
      // Функция для безопасного текста
      const safeText = (text) => {
        if (!text) return '';
        return String(text);
      };
      
      // Заголовок
      doc.fontSize(22)
         .fillColor('#00a8ff')
         .text(safeText(event?.name || 'Мероприятие'), {
           align: 'center',
           width: doc.page.width - 80
         });
      
      doc.moveDown(1.5);
      
      // Информация о мероприятии
      doc.fontSize(11)
         .fillColor('#333333');
      
      if (event?.date) {
        doc.text(`Дата: ${safeText(event.date)}`, {
          align: 'left',
          width: doc.page.width - 80
        });
      }
      if (event?.time) {
        doc.text(`Время: ${safeText(event.time)}`, {
          align: 'left',
          width: doc.page.width - 80
        });
      }
      if (event?.venue) {
        doc.text(`Место: ${safeText(event.venue)}`, {
          align: 'left',
          width: doc.page.width - 80
        });
      }
      if (event?.address) {
        doc.text(`Адрес: ${safeText(event.address)}`, {
          align: 'left',
          width: doc.page.width - 80
        });
      }
      if (category) {
        doc.text(`Категория: ${safeText(category.name)}`, {
          align: 'left',
          width: doc.page.width - 80
        });
      }
      
      doc.moveDown(1.5);
      
      // ID билета
      doc.fontSize(9)
         .fillColor('#666666')
         .text(`ID билета: ${ticketId}`, {
           align: 'left',
           width: doc.page.width - 80
         });
      
      doc.moveDown(2);
      
      // QR-код (центрируем)
      const qrSize = 160;
      const pageWidth = doc.page.width;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = doc.y;
      
      doc.image(qrCodeBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });
      
      // Перемещаем курсор после QR-кода
      doc.y = qrY + qrSize + 20;
      
      // Инструкция
      doc.fontSize(9)
         .fillColor('#666666')
         .text(safeText('Предъявите этот билет на входе.'), {
           align: 'center',
           width: doc.page.width - 80
         });
      doc.text(safeText('QR-код содержит информацию о билете.'), {
        align: 'center',
        width: doc.page.width - 80
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Асинхронная функция для отправки билетов на email
async function sendTicketsToEmailAsync(ticketIds, email, eventId, categoryId, requestId) {
  console.log(`[${requestId}] sendTicketsToEmailAsync called:`, {
    ticketIds,
    email: email?.substring(0, 20) + '...',
    eventId,
    categoryId,
    ticketCount: ticketIds.length
  });
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM || 'Tickets <noreply@ticket-story.com>';
  
  console.log(`[${requestId}] Email config check:`, {
    hasResendKey: !!RESEND_API_KEY,
    resendKeyLength: RESEND_API_KEY?.length || 0,
    emailFrom: EMAIL_FROM
  });
  
  if (!RESEND_API_KEY) {
    console.error(`[${requestId}] ❌ RESEND_API_KEY не настроен, пропускаем отправку email`);
    return;
  }

  // Загружаем конфиг для получения информации о мероприятии
  let eventsConfig = {};
  try {
    const configPath = join(process.cwd(), 'config', 'tickets.json');
    const configData = readFileSync(configPath, 'utf8');
    eventsConfig = JSON.parse(configData);
  } catch (error) {
    console.error(`[${requestId}] Ошибка загрузки конфига:`, error);
  }

  const event = eventsConfig.events?.find(e => e.id === eventId);
  const category = event?.ticketCategories?.find(c => c.id === categoryId);

  console.log(`[${requestId}] Event and category found:`, {
    hasEvent: !!event,
    eventName: event?.name,
    hasCategory: !!category,
    categoryName: category?.name
  });

  // Отправляем каждый билет
  let successCount = 0;
  let failCount = 0;
  
  for (const ticketId of ticketIds) {
    try {
      console.log(`[${requestId}] Sending ticket ${ticketId} to ${email}`);
      
      // Генерируем QR-код для вложения
      const qrCodeBuffer = await QRCode.toBuffer(ticketId, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2
      });
      const qrCodeBase64 = qrCodeBuffer.toString('base64');
      
      // Только QR-код как attachment
      const attachments = [
        {
          filename: `QR-код-билета-${ticketId}.png`,
          content: qrCodeBase64
        }
      ];
      
      const emailPayload = {
        from: EMAIL_FROM,
        to: email,
        subject: `Билет на мероприятие: ${event?.name || 'Мероприятие'}`,
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
              .qr-notice { background: #e3f2fd; border-left: 4px solid #00a8ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .qr-notice strong { display: block; margin-bottom: 8px; color: #00a8ff; }
              .qr-notice p { margin: 5px 0; color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Ваш билет</h1>
              <div class="qr-notice">
                <strong>📎 QR-код вашего билета прикреплен к письму</strong>
                <p>Откройте вложение <strong>QR-код-билета-${ticketId}.png</strong> для просмотра QR-кода.</p>
                <p>QR-код необходим для входа на мероприятие. Сохраните его на телефон или распечатайте.</p>
              </div>
              <div class="ticket">
                <div class="ticket-header">
                  <div class="ticket-title">${event?.name || 'Мероприятие'}</div>
                </div>
                <div class="ticket-info">
                  <span class="ticket-label">Мероприятие:</span> ${event?.name || 'Мероприятие'}
                </div>
                ${event?.date ? `<div class="ticket-info"><span class="ticket-label">Дата:</span> ${event.date}</div>` : ''}
                ${event?.time ? `<div class="ticket-info"><span class="ticket-label">Время:</span> ${event.time}</div>` : ''}
                ${event?.venue ? `<div class="ticket-info"><span class="ticket-label">Место:</span> ${event.venue}</div>` : ''}
                ${event?.address ? `<div class="ticket-info"><span class="ticket-label">Адрес:</span> ${event.address}</div>` : ''}
                ${category ? `<div class="ticket-info"><span class="ticket-label">Категория:</span> ${category.name}</div>` : ''}
                <div class="ticket-info">
                  <span class="ticket-label">ID билета:</span>
                  <span class="ticket-id">${ticketId}</span>
                </div>
              </div>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">Предъявите QR-код на входе. QR-код находится во вложении к этому письму.</p>
            </div>
          </body>
          </html>
        `,
        attachments: attachments
      };
      
      console.log(`[${requestId}] Email payload for ${ticketId}:`, {
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

      const responseData = await emailResponse.json().catch(() => ({}));
      
      if (emailResponse.ok) {
        successCount++;
        console.log(`[${requestId}] ✅ Ticket ${ticketId} sent to ${email}`, {
          responseId: responseData.id,
          status: emailResponse.status
        });
      } else {
        failCount++;
        console.error(`[${requestId}] ❌ Failed to send ticket ${ticketId}:`, {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          error: responseData
        });
      }
    } catch (error) {
      failCount++;
      console.error(`[${requestId}] ❌ Error sending ticket ${ticketId}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }
  
  console.log(`[${requestId}] Email sending completed: ${successCount} sent, ${failCount} failed out of ${ticketIds.length} total`);
}

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
        const baseTimestamp = Date.now();
        for (let i = 0; i < quantity; i++) {
          const randomStr = Math.random().toString(36).substr(2, 9);
          const ticketId = `TICKET-${baseTimestamp}-${randomStr}-${i}`;
          ticketIds.push(ticketId);
        }
        console.log(`[${requestId}] Generated ${ticketIds.length} tickets:`, ticketIds);
        
        // Автоматически отправляем билеты на email, если email указан
        const email = payment.metadata?.email;
        const sendEmail = payment.metadata?.sendEmail;
        
        console.log(`[${requestId}] Email sending check:`, {
          hasEmail: !!email,
          email: email ? email.substring(0, 20) + '...' : 'none',
          sendEmail: sendEmail,
          shouldSend: email && sendEmail !== 'false'
        });
        
        if (email && sendEmail !== 'false') {
          console.log(`[${requestId}] ✅ Auto-sending ${ticketIds.length} tickets to email: ${email.substring(0, 20)}...`);
          // Отправляем билеты асинхронно (не блокируем webhook)
          sendTicketsToEmailAsync(ticketIds, email, payment.metadata.eventId, payment.metadata.categoryId, requestId)
            .then(() => {
              console.log(`[${requestId}] ✅ Email sending completed for payment ${paymentId}`);
            })
            .catch(err => {
              console.error(`[${requestId}] ❌ Error in async email sending:`, {
                message: err.message,
                stack: err.stack
              });
            });

          // Отправляем информационный чек через Resend (если фискальный чек не был отправлен через ЮКассу)
          const sendReceipt = payment.metadata?.sendReceipt !== 'false';
          if (sendReceipt) {
            console.log(`[${requestId}] 📧 Sending receipt to email: ${email.substring(0, 20)}...`);
            // Загружаем конфиг для получения информации о мероприятии
            let eventsConfig = {};
            try {
              const configPath = join(process.cwd(), 'config', 'tickets.json');
              const configData = readFileSync(configPath, 'utf8');
              eventsConfig = JSON.parse(configData);
            } catch (error) {
              console.error(`[${requestId}] Ошибка загрузки конфига для чека:`, error);
            }
            const event = eventsConfig.events?.find(e => e.id === payment.metadata.eventId);
            const category = event?.ticketCategories?.find(c => c.id === payment.metadata.categoryId);
            // Отправляем чек асинхронно (не блокируем webhook)
            sendReceiptAsync(payment, event, category, requestId)
              .then(result => {
                if (result.success) {
                  console.log(`[${requestId}] ✅ Receipt sent successfully:`, result.emailId);
                } else {
                  console.log(`[${requestId}] ⚠️ Receipt sending skipped or failed:`, result.error || result.reason);
                }
              })
              .catch(err => {
                console.error(`[${requestId}] ❌ Error sending receipt:`, {
                  message: err.message,
                  stack: err.stack
                });
              });
          }
        } else {
          console.log(`[${requestId}] ⏭️ Skipping email sending:`, {
            reason: !email ? 'no email' : 'sendEmail is false',
            email: !!email,
            sendEmail: sendEmail
          });
        }
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
