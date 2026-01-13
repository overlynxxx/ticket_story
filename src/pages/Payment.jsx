import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer'
import PaymentQR from '../components/PaymentQR'
import { createYooKassaPayment, getPaymentQRCode, getPaymentUrl } from '../utils/yookassa'
import './Payment.css'

// URL бэкенда (можно вынести в конфиг)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

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
          // Таймаут 5 секунд
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Ошибка создания платежа')
        }

        // Если бесплатный билет
        if (data.free && data.ticketId) {
          navigate(`/ticket/${data.ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
          return
        }

        // Для платных билетов
        if (data.paymentId && paymentMethod === 'qr') {
          const paymentUrl = data.qrCode || data.confirmationUrl

          if (paymentUrl) {
            setPaymentData({
              paymentId: data.paymentId,
              paymentUrl: paymentUrl,
              amount: totalPrice
            })
            setShowQR(true)
            setIsProcessing(false)
            return
          }
        }

        paymentData = data
      } catch (backendError) {
        console.warn('Бэкенд недоступен, используем прямую интеграцию:', backendError)
        useBackend = false
        
        // Fallback: прямая интеграция с ЮКассой (только для тестирования)
        const description = `Билеты: ${event.name} - ${category.name} × ${quantity}`
        const payment = await createYooKassaPayment(
          totalPrice,
          description,
          {
            eventId: currentEventId,
            categoryId: categoryId,
            quantity: quantity.toString(),
            userId: userId.toString(),
            eventName: event.name
          }
        )

        if (payment && paymentMethod === 'qr') {
          const qrCode = getPaymentQRCode(payment)
          const paymentUrl = getPaymentUrl(payment) || qrCode

          if (paymentUrl) {
            setPaymentData({
              paymentId: payment.id,
              paymentUrl: paymentUrl,
              amount: totalPrice,
              useBackend: false // Флаг что используем прямую интеграцию
            })
            setShowQR(true)
            setIsProcessing(false)
            return
          }
        }
      }

      if (!paymentData) {
        throw new Error('Не удалось создать платеж')
      }
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      
      // Более понятное сообщение об ошибке
      let errorMessage = 'Произошла ошибка при обработке платежа'
      
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 3001, или проверьте подключение к интернету.'
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

      {/* Кнопка оплаты */}
      <button 
        className="payment-button" 
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? 'Обработка...' : totalPrice === 0 ? 'Получить билет' : 'Оплатить'}
      </button>

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
