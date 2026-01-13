import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer'
import PaymentQR from '../components/PaymentQR'
import { createYooKassaPayment, getPaymentQRCode, getPaymentUrl } from '../utils/yookassa'
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

  useEffect(() => {
    if (webApp) {
      webApp.MainButton.setText('Оплатить')
      webApp.MainButton.show()
      webApp.MainButton.onClick(handlePayment)
      return () => {
        webApp.MainButton.hide()
        webApp.MainButton.offClick(handlePayment)
      }
    }
  }, [webApp, paymentMethod])

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
      
      // Создаем описание платежа
      const description = `Билеты: ${event.name} - ${category.name} × ${quantity}`
      
      // Создаем платеж в ЮКассе используя реальные цены из конфига
      const payment = await createYooKassaPayment(
        totalPrice, // Используем реальную цену из конфига
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
        // Получаем QR код или URL для оплаты
        const qrCode = getPaymentQRCode(payment)
        const paymentUrl = getPaymentUrl(payment) || qrCode

        if (paymentUrl) {
          setPaymentData({
            paymentId: payment.id,
            paymentUrl: paymentUrl,
            amount: totalPrice
          })
          setShowQR(true)
          setIsProcessing(false)
        } else {
          throw new Error('Не удалось получить QR код для оплаты')
        }
      }
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      alert(`Произошла ошибка при обработке платежа: ${error.message}`)
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = (payment) => {
    // После успешной оплаты создаем билет
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const currentEventId = eventId || event?.id
    setShowQR(false)
    navigate(`/ticket/${ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
  }

  const handlePaymentCancel = () => {
    setShowQR(false)
    setIsProcessing(false)
  }

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
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={handlePaymentCancel}
        />
      )}

      <Footer />
    </div>
  )
}

export default Payment
