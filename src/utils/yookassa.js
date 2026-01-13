/**
 * Утилита для работы с ЮКассой
 * ВАЖНО: Для продакшена используйте бэкенд API!
 */

export async function createYooKassaPayment(amount, description, metadata = {}) {
  const shopId = '1248098' // Тестовый ShopID
  const secretKey = 'test_44nfjs8TvfyAWb77UlYIUU5kGUB28f-gITBPdKVyKpE' // Тестовый ключ

  // ВАЖНО: В продакшене этот запрос должен идти через ваш бэкенд!
  // Здесь используется прямой запрос только для тестирования

  try {
    // Создаем платеж через API ЮКассы
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'qr',
          return_url: window.location.origin + '/payment-success'
        },
        capture: true,
        description: description,
        metadata: metadata
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.description || 'Ошибка создания платежа')
    }

    const payment = await response.json()
    return payment
  } catch (error) {
    console.error('Ошибка создания платежа ЮКассы:', error)
    throw error
  }
}

export function getPaymentQRCode(payment) {
  // Получаем QR код из confirmation_data
  if (payment.confirmation && payment.confirmation.confirmation_data) {
    return payment.confirmation.confirmation_data
  }
  return null
}

export function getPaymentUrl(payment) {
  // Получаем URL для оплаты
  if (payment.confirmation && payment.confirmation.confirmation_url) {
    return payment.confirmation.confirmation_url
  }
  return null
}
