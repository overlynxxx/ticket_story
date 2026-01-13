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
    
    // Формируем return_url
    const returnUrl = process.env.RETURN_URL || 
                     (req.headers.origin ? `${req.headers.origin}/payment-success` : 'https://ticket-story.vercel.app/payment-success');
    
    // Для QR-кода через СБП нужно указать payment_method_data
    // Согласно документации: https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process
    const payment = await checkout.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      payment_method_data: {
        type: 'sbp' // Система быстрых платежей (СБП) для QR-кода
      },
      confirmation: {
        type: 'qr',
        return_url: returnUrl,
      },
      capture: true, // Одностадийный платеж (сразу списываем деньги)
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

    // Для QR-кода используем confirmation_data (строка с данными для QR)
    // Если его нет, используем confirmation_url (URL для оплаты)
    // Согласно документации: https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process
    const qrCode = payment.confirmation?.confirmation_data || payment.confirmation?.confirmation_url;

    // Проверяем, что получили данные для QR-кода
    if (!qrCode) {
      console.error('No QR code data in payment response:', payment);
      return res.status(500).json({
        success: false,
        error: 'Не получены данные для QR-кода от ЮКассы'
      });
    }

    res.json({
      success: true,
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
      qrCode: qrCode,
      amount: amount,
      status: payment.status // Добавляем статус для отладки
    });
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

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
