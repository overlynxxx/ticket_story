import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../utils/api'
import './PaymentSuccess.css'

function PaymentSuccess({ webApp, config }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const paymentId = searchParams.get('payment_id')
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Получаем payment_id из URL (ЮКасса добавляет его в query параметры)
    const urlPaymentId = searchParams.get('payment_id') || 
                        searchParams.get('paymentId') || 
                        window.location.search.match(/payment[_-]?id=([^&]+)/)?.[1]
    
    if (!urlPaymentId && !paymentId) {
      setError('Не найден ID платежа в URL')
      setLoading(false)
      return
    }

    const actualPaymentId = urlPaymentId || paymentId

    // Проверяем статус платежа
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/payment/${actualPaymentId}/status`)
        
        if (!response.ok) {
          throw new Error('Не удалось проверить статус платежа')
        }

        const data = await response.json()
        console.log('Payment status check:', data)
        
        if (data.success && data.status === 'succeeded') {
          setPaymentStatus('succeeded')
          
          // Получаем данные из metadata платежа
          const eventId = data.metadata?.eventId || searchParams.get('eventId')
          const categoryId = data.metadata?.categoryId || searchParams.get('categoryId')
          const quantity = parseInt(data.metadata?.quantity || searchParams.get('quantity') || '1')
          
          // Используем билеты из ответа API или генерируем новые
          const ticketIds = data.ticketIds && data.ticketIds.length > 0
            ? data.ticketIds
            : (() => {
                const ids = []
                for (let i = 0; i < quantity; i++) {
                  ids.push(`TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`)
                }
                return ids
              })()
          
          // Перенаправляем на страницу билетов
          const firstTicketId = ticketIds[0]
          navigate(`/ticket/${firstTicketId}?category=${categoryId}&quantity=${quantity}&eventId=${eventId}&tickets=${ticketIds.join(',')}`, { replace: true })
        } else if (data.status === 'canceled') {
          setPaymentStatus('canceled')
        } else {
          setPaymentStatus('pending')
          // Повторяем проверку через 2 секунды (максимум 10 попыток)
          const attempts = parseInt(searchParams.get('attempts') || '0')
          if (attempts < 10) {
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams)
              newSearchParams.set('attempts', (attempts + 1).toString())
              window.location.search = newSearchParams.toString()
            }, 2000)
          } else {
            setError('Превышено время ожидания подтверждения платежа')
          }
        }
      } catch (err) {
        console.error('Ошибка проверки платежа:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkPaymentStatus()
  }, [paymentId, navigate, searchParams])

  if (loading) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="loading-spinner"></div>
          <p>Проверка статуса платежа...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card error">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="back-button">
            Вернуться на главную
          </button>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'canceled') {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card error">
          <h2>Платеж отменен</h2>
          <p>Платеж был отменен. Попробуйте оплатить снова.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Вернуться на главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-success-container">
      <div className="payment-success-card">
        <div className="loading-spinner"></div>
        <p>Ожидание подтверждения платежа...</p>
      </div>
    </div>
  )
}

export default PaymentSuccess
