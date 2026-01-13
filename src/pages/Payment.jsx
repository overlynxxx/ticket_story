import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer'
import PaymentQR from '../components/PaymentQR'
import { createYooKassaPayment, getPaymentQRCode, getPaymentUrl } from '../utils/yookassa'
import { API_URL } from '../utils/api'
import './Payment.css'

function Payment({ webApp, config }) {
  const { eventId, categoryId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const quantity = parseInt(searchParams.get('quantity') || '1')
  const [paymentMethod, setPaymentMethod] = useState('qr')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [paymentData, setPaymentData] = useState(null)

  // Находим мероприятие
  const event = eventId 
    ? config.events?.find(e => e.id === eventId)
    : config.events?.[0] // Для обратной совместимости

  // Находим категорию билетов
  const category = event?.ticketCategories?.find(cat => cat.id === categoryId)
  const totalPrice = category ? category.price * quantity : 0

  const handlePayment = async () => {
    if (isProcessing) return

    // Если цена 0 (бесплатный билет), сразу выдаем билет
    if (totalPrice === 0) {
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const currentEventId = eventId || event?.id
      navigate(`/ticket/${ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
      return
    }

    setIsProcessing(true)

    try {
      const currentEventId = eventId || event?.id
      const userId = webApp?.initDataUnsafe?.user?.id || 'anonymous'
      
      // Пытаемся создать платеж через бэкенд API
      let paymentData = null
      let useBackend = true

      try {
        // Создаем AbortController для таймаута (совместимость с браузерами)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд

        const response = await fetch(`${API_URL}/api/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: totalPrice,
            eventId: currentEventId,
            categoryId: categoryId,
            quantity: quantity,
            userId: userId
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
          
          // Более понятное сообщение об ошибке
          const errorMessage = errorData.error || errorData.message || `Ошибка сервера (${response.status})`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log('Payment created:', data)

        if (!data.success) {
          throw new Error(data.error || 'Ошибка создания платежа')
        }

        // Если бесплатный билет
        if (data.free && data.ticketId) {
          navigate(`/ticket/${data.ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
          return
        }

        // Для платных билетов через СБП
        if (data.paymentId && data.confirmationUrl) {
          console.log('Payment URL for SBP:', data.confirmationUrl)
          console.log('Full payment data:', data)

          // Для СБП используем confirmation_url - это страница ЮКассы с QR-кодом
          // На странице пользователь увидит QR-код (на компьютере) или список банков (на мобильном)
          // Используем window.location.href для редиректа (работает везде)
          window.location.href = data.confirmationUrl

          // Сохраняем данные платежа для проверки статуса
          setPaymentData({
            paymentId: data.paymentId,
            paymentUrl: data.confirmationUrl,
            amount: totalPrice
          })

          setIsProcessing(false)
          
          // Показываем сообщение пользователю
          if (webApp) {
            webApp.showAlert('Откройте страницу оплаты, отсканируйте QR-код или выберите банк. После оплаты вернитесь в приложение.')
          } else {
            alert('Откройте страницу оплаты, отсканируйте QR-код или выберите банк. После оплаты вернитесь в приложение.')
          }
          
          return
        } else {
          console.error('Missing paymentId or confirmationUrl:', data)
          throw new Error('Не получены данные для оплаты. Попробуйте позже.')
        }

        paymentData = data
      } catch (backendError) {
        console.error('Ошибка при создании платежа через бэкенд:', backendError)
        
        // Показываем ошибку пользователю
        const errorMessage = backendError.message || 'Не удалось создать платеж. Попробуйте позже.'
        alert(`Ошибка: ${errorMessage}`)
        setIsProcessing(false)
        return // Выходим из функции, не продолжаем выполнение
      }

      // Если paymentData не установлен, это ошибка
      if (!paymentData) {
        console.error('Payment data is missing after successful API call')
        alert('Ошибка: Не удалось получить данные платежа')
        setIsProcessing(false)
        return
      }
    } catch (error) {
      console.error('Критическая ошибка оплаты:', error)
      
      // Более понятное сообщение об ошибке
      let errorMessage = 'Произошла ошибка при обработке платежа'
      
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания ответа от сервера. Проверьте подключение к интернету и попробуйте снова.'
      } else if (error.message && error.message.includes('Failed to fetch')) {
        errorMessage = `Не удалось подключиться к серверу. Проверьте подключение к интернету или попробуйте позже.`
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = (data) => {
    // После успешной оплаты переходим к билету
    const ticketId = data.ticketId || `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const currentEventId = eventId || event?.id
    setShowQR(false)
    navigate(`/ticket/${ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
  }

  const handlePaymentCancel = () => {
    setShowQR(false)
    setIsProcessing(false)
  }

  // Настройка кнопки Telegram
  useEffect(() => {
    if (webApp) {
      const buttonText = totalPrice === 0 ? 'Получить билет' : 'Оплатить'
      webApp.MainButton.setText(buttonText)
      webApp.MainButton.show()
      webApp.MainButton.onClick(handlePayment)
      return () => {
        webApp.MainButton.hide()
        webApp.MainButton.offClick(handlePayment)
      }
    }
  }, [webApp, totalPrice, isProcessing])

  if (!event) {
    return (
      <div className="error-container">
        <p>Мероприятие не найдено</p>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться назад
        </button>
        <Footer />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="error-container">
        <p>Категория билетов не найдена</p>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться назад
        </button>
        <Footer />
      </div>
    )
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <div className="payment-event-name">{event.name}</div>
        <h2 className="payment-title">Оплата билетов</h2>
        <div className="payment-summary">
          <p>{category.name} × {quantity}</p>
          <p className="payment-total">Итого: {totalPrice} ₽</p>
        </div>
      </div>

      <div className="payment-methods">
        <h3 className="methods-title">Способ оплаты</h3>
        <div className="method-options">
          <label className={`method-option ${paymentMethod === 'qr' ? 'active' : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="qr"
              checked={paymentMethod === 'qr'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <div className="method-content">
              <span className="method-icon">📱</span>
              <div>
                <span className="method-name">QR-код</span>
                <span className="method-description">Оплата через приложение банка</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {paymentMethod === 'qr' && (
        <div className="qr-info">
          <p className="info-text">
            После нажатия кнопки "Оплатить" откроется QR-код для оплаты.
            После успешной оплаты вы получите билет с QR-кодом.
          </p>
        </div>
      )}

      {/* Кнопка оплаты - показываем только если НЕ в Telegram (в Telegram используется MainButton) */}
      {!webApp && (
        <button 
          className="payment-button" 
          onClick={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? 'Обработка...' : totalPrice === 0 ? 'Получить билет' : 'Оплатить'}
        </button>
      )}

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <p>Создание платежа...</p>
        </div>
      )}

      {showQR && paymentData && (
        <PaymentQR
          paymentUrl={paymentData.paymentUrl}
          paymentId={paymentData.paymentId}
          paymentData={paymentData}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={handlePaymentCancel}
        />
      )}

      <Footer />
    </div>
  )
}

export default Payment
