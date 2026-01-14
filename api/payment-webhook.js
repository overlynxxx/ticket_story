import { YooCheckout } from '@a2seven/yoo-checkout';
import { readFileSync } from 'fs';
import { join } from 'path';

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
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Ваш билет</h1>
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
              <p>Предъявите этот билет на входе. QR-код будет доступен в приложении.</p>
            </div>
          </body>
          </html>
        `
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
          // Временно отключено для отладки синтаксической ошибки
          // const sendReceipt = payment.metadata?.sendReceipt !== 'false';
          // if (sendReceipt) {
          //   console.log(`[${requestId}] 📧 Sending receipt to email: ${email.substring(0, 20)}...`);
          //   // Отправляем чек асинхронно
          //   fetch(`${process.env.VERCEL_URL || 'https://tupik.xyz'}/api/payment/${paymentId}/send-receipt`, {
          //     method: 'POST',
          //     headers: {
          //       'Content-Type': 'application/json'
          //     },
          //     body: JSON.stringify({ paymentId })
          //   })
          //     .then(res => res.json())
          //     .then(data => {
          //       if (data.success) {
          //         console.log(`[${requestId}] ✅ Receipt sent successfully:`, data.emailId);
          //       } else {
          //         console.log(`[${requestId}] ⚠️ Receipt sending skipped or failed:`, data.error);
          //       }
          //     })
          //     .catch(err => {
          //       console.error(`[${requestId}] ❌ Error sending receipt:`, {
          //         message: err.message,
          //         stack: err.stack
          //       });
          //     });
          // }
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
