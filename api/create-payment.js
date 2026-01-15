import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] [${new Date().toISOString()}] create-payment: ${req.method} ${req.url}`);
  
  // Устанавливаем заголовки для корректной работы из всех регионов
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  console.log(`[${requestId}] Headers:`, {
    origin: req.headers.origin,
    host: req.headers.host,
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  });

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, eventId, categoryId, quantity, userId, email } = req.body;
    console.log(`[${requestId}] Request body:`, { amount, eventId, categoryId, quantity, userId: userId?.substring(0, 10), email: email ? email.substring(0, 20) + '...' : 'not provided' });

    // Валидация
    if (!amount || !eventId || !categoryId || !quantity) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных для создания платежа'
      });
    }

    // Валидация email
    if (!email || !email.trim()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'Email адрес обязателен'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'Неверный формат email адреса'
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
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: 'Ошибка загрузки конфигурации'
      });
    }

    // Находим мероприятие и категорию
    const event = eventsConfig.events?.find(e => e.id === eventId);
    if (!event) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({
        success: false,
        error: 'Мероприятие не найдено'
      });
    }

    const category = event.ticketCategories?.find(c => c.id === categoryId);
    if (!category) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({
        success: false,
        error: 'Категория билетов не найдена'
      });
    }

    // Проверяем цену
    const expectedPrice = category.price * quantity;
    if (Math.abs(amount - expectedPrice) > 0.01) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'Неверная сумма платежа'
      });
    }

    // Если цена 0, сразу создаем билет
    if (amount === 0) {
      const ticketId = `TICKET-${Date.now()}-${uuidv4().substr(0, 8)}`;
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        ticketId: ticketId,
        free: true
      });
    }

    // Инициализация ЮКассы
    const shopId = process.env.YOOKASSA_SHOP_ID || eventsConfig.yookassa?.shopId;
    const secretKey = process.env.YOOKASSA_SECRET_KEY || eventsConfig.yookassa?.secretKey;

    // Проверяем наличие ключей
    if (!shopId || !secretKey) {
      console.error('YooKassa credentials missing:', { 
        hasShopId: !!shopId, 
        hasSecretKey: !!secretKey,
        envShopId: !!process.env.YOOKASSA_SHOP_ID,
        envSecretKey: !!process.env.YOOKASSA_SECRET_KEY
      });
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: 'Не настроены ключи ЮКассы. Проверьте переменные окружения YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY'
      });
    }

    console.log('Creating payment with:', {
      shopId: shopId.substring(0, 4) + '...',
      amount,
      eventId,
      categoryId,
      quantity
    });

    const checkout = new YooCheckout({
      shopId: shopId,
      secretKey: secretKey,
    });

    // Создаем платеж в ЮКассе
    // Согласно документации: https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process
    const idempotenceKey = uuidv4();
    
    // Формируем return_url - после оплаты пользователь вернется на эту страницу
    // На странице payment-success будет проверен статус платежа и созданы билеты
    // ЮКасса автоматически добавит payment_id в query параметры
    const baseUrl = req.headers.origin || process.env.VERCEL_URL || 'https://tupik.xyz'
    const returnUrl = process.env.RETURN_URL || `${baseUrl}/payment-success`
    console.log(`[${requestId}] Base URL: ${baseUrl}, Return URL: ${returnUrl}`)
    
    // Оплата через СБП (Система быстрых платежей)
    // Согласно документации: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sbp
    // Для СБП нужно:
    // 1. payment_method_data с типом 'sbp'
    // 2. confirmation с типом 'redirect' (не 'qr'!)
    // 3. После создания платежа перенаправить пользователя на confirmation_url
    
    // Подготовка данных для фискального чека (54-ФЗ)
    // ВАЖНО: Для работы фискальных чеков нужна настройка онлайн-кассы и ОФД в ЮКассе
    // Если онлайн-касса не настроена, параметр receipt будет проигнорирован
    const receiptEnabled = process.env.YOOKASSA_RECEIPT_ENABLED === 'true';
    console.log(`[${requestId}] Receipt configuration check:`, {
      YOOKASSA_RECEIPT_ENABLED: process.env.YOOKASSA_RECEIPT_ENABLED,
      receiptEnabled: receiptEnabled,
      envValue: process.env.YOOKASSA_RECEIPT_ENABLED,
      type: typeof process.env.YOOKASSA_RECEIPT_ENABLED
    });

    const receipt = receiptEnabled ? {
      customer: {
        email: email.trim()
      },
      items: [
        {
          description: `Билеты: ${event.name} - ${category.name}`,
          quantity: quantity.toString(),
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB'
          },
          vat_code: 1, // Без НДС (код 1)
          payment_subject: 'service', // Услуга
          payment_mode: 'full_payment', // Полный расчет
          measure: 'piece' // Штука, единица товара
        }
      ],
      settlements: [
        {
          type: 'cashless' // Безналичный расчет
        }
      ],
      timezone: 2 // Москва, Санкт-Петербург, Нижний Новгород (UTC+3, MCK)
    } : undefined;

    console.log(`[${requestId}] Receipt object:`, receipt ? {
      hasReceipt: true,
      customerEmail: receipt.customer?.email?.substring(0, 20) + '...',
      itemsCount: receipt.items?.length,
      firstItem: receipt.items?.[0] ? {
        description: receipt.items[0].description,
        quantity: receipt.items[0].quantity,
        amount: receipt.items[0].amount,
        vat_code: receipt.items[0].vat_code
      } : null
    } : { hasReceipt: false });

    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      payment_method_data: {
        type: 'sbp' // Система быстрых платежей
      },
      confirmation: {
        type: 'redirect', // Для СБП используется redirect, не qr!
        return_url: returnUrl,
      },
      capture: true, // Одностадийный платеж (сразу списываем деньги)
      description: `Билеты: ${event.name} - ${category.name} × ${quantity}`,
      metadata: {
        eventId,
        categoryId,
        quantity: quantity.toString(),
        userId: userId || 'anonymous',
        email: email.trim(),
        sendEmail: 'true', // Сохраняем согласие на отправку email (всегда true, так как это обязательное поле)
        sendReceipt: 'true', // Флаг для отправки информационного чека через Resend
        eventName: event.name,
        categoryName: category.name
      },
    };

    // Добавляем receipt только если он настроен
    if (receipt) {
      paymentData.receipt = receipt;
      console.log(`[${requestId}] ✅ Фискальный чек будет отправлен через ЮКассу на email: ${email.substring(0, 20)}...`);
      console.log(`[${requestId}] Receipt data added to payment:`, {
        customer: paymentData.receipt.customer,
        itemsCount: paymentData.receipt.items.length
      });
    } else {
      console.log(`[${requestId}] ⚠️ Фискальный чек отключен (YOOKASSA_RECEIPT_ENABLED !== 'true'). Информационный чек будет отправлен через Resend.`);
    }

    const payment = await checkout.createPayment(paymentData, idempotenceKey);

    // Логируем ответ от ЮКассы для отладки
    console.log(`[${requestId}] YooKassa payment response:`, {
      id: payment.id,
      status: payment.status,
      confirmation: payment.confirmation,
      confirmationUrl: payment.confirmation?.confirmation_url,
      confirmationData: payment.confirmation?.confirmation_data,
      returnUrl: returnUrl,
      receipt: payment.receipt || 'not provided in response',
      hasReceipt: !!payment.receipt
    });

    // Проверяем, был ли receipt принят ЮКассой
    if (receipt && !payment.receipt) {
      console.warn(`[${requestId}] ⚠️ WARNING: Receipt was sent but not returned in payment response. This might mean:`);
      console.warn(`[${requestId}]   1. Online cash register is not configured in YooKassa`);
      console.warn(`[${requestId}]   2. OFD (Operator of Fiscal Data) is not connected`);
      console.warn(`[${requestId}]   3. Receipt sending is disabled in YooKassa settings`);
      console.warn(`[${requestId}]   4. Using test shop (receipts may not work in test mode)`);
    } else if (receipt && payment.receipt) {
      console.log(`[${requestId}] ✅ Receipt accepted by YooKassa:`, {
        receiptId: payment.receipt.id,
        status: payment.receipt.status,
        fiscalDocumentNumber: payment.receipt.fiscal_document_number,
        fiscalStorageNumber: payment.receipt.fiscal_storage_number
      });
    }

    // Для СБП используем confirmation_url - это ссылка на страницу ЮКассы с QR-кодом
    // На странице ЮКассы пользователь увидит QR-код (на компьютере) или список банков (на мобильном)
    // Согласно документации: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sbp
    const confirmationUrl = payment.confirmation?.confirmation_url;

    // Проверяем, что получили URL для оплаты
    if (!confirmationUrl) {
      console.error('No confirmation URL in payment response:', payment);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: 'Не получен URL для оплаты от ЮКассы'
      });
    }

    // Явно устанавливаем Content-Type для корректной обработки на фронтенде
    const responseData = {
      success: true,
      paymentId: payment.id,
      confirmationUrl: confirmationUrl, // URL страницы ЮКассы с QR-кодом СБП
      amount: amount,
      status: payment.status,
      paymentMethod: payment.payment_method?.type, // 'sbp'
      returnUrl: returnUrl // Для отладки
    };
    console.log(`[${requestId}] Sending response:`, { ...responseData, confirmationUrl: confirmationUrl?.substring(0, 50) + '...' });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseData);
  } catch (error) {
    // Детальное логирование ошибки
    console.error('Ошибка создания платежа:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data || error.response,
      status: error.response?.status,
      code: error.code
    });

    // Обработка специфичных ошибок ЮКассы
    let errorMessage = 'Ошибка создания платежа';
    let statusCode = 500;

    if (error.response) {
      // Ошибка от API ЮКассы
      const yooError = error.response.data || error.response;
      statusCode = error.response.status || 500;
      
      if (yooError.description) {
        errorMessage = `Ошибка ЮКассы: ${yooError.description}`;
      } else if (yooError.message) {
        errorMessage = `Ошибка ЮКассы: ${yooError.message}`;
      } else if (typeof yooError === 'string') {
        errorMessage = `Ошибка ЮКассы: ${yooError}`;
      } else {
        errorMessage = `Ошибка ЮКассы (код ${statusCode})`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Специальные случаи
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Неверные ключи доступа к ЮКассе. Проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY';
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorMessage = 'Доступ запрещен. Проверьте права доступа к магазину ЮКассы';
    } else if (error.message?.includes('Network') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Не удалось подключиться к серверу ЮКассы. Проверьте подключение к интернету';
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
