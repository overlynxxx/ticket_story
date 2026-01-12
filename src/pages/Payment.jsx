import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './Payment.css'

function Payment({ webApp, config }) {
  const { categoryId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const quantity = parseInt(searchParams.get('quantity') || '1')
  const [paymentMethod, setPaymentMethod] = useState('qr')
  const [isProcessing, setIsProcessing] = useState(false)

  const category = config.ticketCategories.find(cat => cat.id === categoryId)
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

    setIsProcessing(true)

    try {
      // ВАЖНО: В продакшене используйте реальный бэкенд API!
      // Пример реального кода:
      /*
      const response = await fetch('https://your-api.com/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          ticketCategory: categoryId,
          quantity: quantity,
          userId: webApp?.initDataUnsafe?.user?.id || 'anonymous'
        })
      })
      
      const data = await response.json()
      
      if (data.success && paymentMethod === 'qr') {
        // Открываем QR код для оплаты
        if (data.qrCode) {
          // Показываем QR код пользователю
          // После оплаты проверяем статус через polling или webhook
          const checkPaymentStatus = async () => {
            const statusResponse = await fetch(`https://your-api.com/api/payment/${data.paymentId}/status`)
            const statusData = await statusResponse.json()
            
            if (statusData.status === 'succeeded') {
              navigate(`/ticket/${statusData.ticketId}?category=${categoryId}&quantity=${quantity}`)
            } else {
              setTimeout(checkPaymentStatus, 3000) // Проверяем каждые 3 секунды
            }
          }
          checkPaymentStatus()
        }
      }
      */
      
      // ДЕМО РЕЖИМ: Симуляция успешной оплаты
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setTimeout(() => {
        navigate(`/ticket/${ticketId}?category=${categoryId}&quantity=${quantity}`)
      }, 1500)
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      alert('Произошла ошибка при обработке платежа')
      setIsProcessing(false)
    }
  }

  if (!category) {
    return (
      <div className="error-container">
        <p>Категория билетов не найдена</p>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться назад
        </button>
      </div>
    )
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
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
          <p>Обработка платежа...</p>
        </div>
      )}
    </div>
  )
}

export default Payment
