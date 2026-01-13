import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './PaymentQR.css'

function PaymentQR({ paymentUrl, paymentId, onPaymentSuccess, onPaymentCancel }) {
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [checking, setChecking] = useState(false)

  // URL бэкенда
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

  // Проверка статуса платежа через бэкенд
  useEffect(() => {
    if (!paymentId || checking) return

    const checkStatus = async () => {
      setChecking(true)
      try {
        const response = await fetch(`${API_URL}/api/payment/${paymentId}/status`)

        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.status === 'succeeded') {
            setPaymentStatus('succeeded')
            if (onPaymentSuccess) {
              onPaymentSuccess({ ticketId: data.ticketId })
            }
            return
          } else if (data.status === 'canceled') {
            setPaymentStatus('canceled')
            if (onPaymentCancel) {
              onPaymentCancel()
            }
            return
          }
        }
      } catch (error) {
        console.error('Ошибка проверки статуса:', error)
      } finally {
        setChecking(false)
      }

      // Проверяем каждые 3 секунды
      setTimeout(checkStatus, 3000)
    }

    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [paymentId, checking, onPaymentSuccess, onPaymentCancel, API_URL])

  return (
    <div className="payment-qr-container">
      <div className="payment-qr-content">
        <h3 className="qr-title">Отсканируйте QR-код для оплаты</h3>
        {paymentUrl && (
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={paymentUrl}
              size={250}
              level="H"
              includeMargin={true}
            />
          </div>
        )}
        <div className="qr-instructions">
          <p>1. Откройте приложение вашего банка</p>
          <p>2. Отсканируйте QR-код</p>
          <p>3. Подтвердите оплату</p>
        </div>
        {paymentStatus === 'pending' && (
          <div className="payment-status">
            <div className="status-spinner"></div>
            <p>Ожидание оплаты...</p>
          </div>
        )}
        {paymentStatus === 'succeeded' && (
          <div className="payment-status success">
            <p>✅ Оплата успешно завершена!</p>
          </div>
        )}
        {paymentStatus === 'canceled' && (
          <div className="payment-status error">
            <p>❌ Платеж отменен</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentQR
