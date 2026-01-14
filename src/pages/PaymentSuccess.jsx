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
    // Получаем payment_id из URL (ЮКасса может добавлять его по-разному)
    const urlParams = new URLSearchParams(window.location.search)
    const urlPaymentId = urlParams.get('payment_id') || 
                        urlParams.get('paymentId') || 
                        urlParams.get('orderId') ||
                        urlParams.get('payment_id') || // Дублируем для надежности
                        window.location.hash.match(/payment[_-]?id=([^&]+)/)?.[1] ||
                        window.location.search.match(/payment[_-]?id=([^&]+)/)?.[1]
    
    console.log('[PaymentSuccess] Page loaded:', {
      fullUrl: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      urlPaymentId,
      allParams: Object.fromEntries(urlParams),
      timestamp: new Date().toISOString()
    })

    if (!urlPaymentId && !paymentId) {
      // Если нет payment_id, но есть другие параметры, пробуем найти в localStorage
      const savedPaymentId = localStorage.getItem('lastPaymentId')
      const savedPaymentData = localStorage.getItem('lastPaymentData')
      
      if (savedPaymentId) {
        console.log('Using saved payment ID from localStorage:', savedPaymentId)
        if (savedPaymentData) {
          try {
            const data = JSON.parse(savedPaymentData)
            // Добавляем параметры в URL для использования в навигации
            const params = new URLSearchParams(window.location.search)
            if (data.eventId) params.set('eventId', data.eventId)
            if (data.categoryId) params.set('categoryId', data.categoryId)
            if (data.quantity) params.set('quantity', data.quantity.toString())
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
          } catch (e) {
            console.error('Error parsing saved payment data:', e)
          }
        }
        checkPaymentAndRedirect(savedPaymentId)
        return
      }
      
      setError('Не найден ID платежа. Проверьте URL или попробуйте оплатить снова.')
      setLoading(false)
      return
    }

    const actualPaymentId = urlPaymentId || paymentId
    checkPaymentAndRedirect(actualPaymentId)
  }, [paymentId, navigate, searchParams])

  const checkPaymentAndRedirect = async (actualPaymentId) => {
    try {
      const statusUrl = `${API_URL}/api/payment/${actualPaymentId}/status`
      console.log('[PaymentSuccess] Checking payment status:', {
        paymentId: actualPaymentId,
        apiUrl: API_URL,
        fullUrl: statusUrl,
        timestamp: new Date().toISOString()
      })
      const response = await fetch(statusUrl)
      
      // Проверяем Content-Type перед парсингом JSON
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from payment status API:', {
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          textPreview: text.substring(0, 200),
          url: `${API_URL}/api/payment/${actualPaymentId}/status`
        })
        // Если это HTML (404 страница), даем более понятное сообщение
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('API endpoint не найден. Проверьте, что сервер развернут корректно.')
        }
        throw new Error(`Сервер вернул неверный формат ответа (${contentType || 'не указан'}). Проверьте, что API работает корректно.`)
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Payment status API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.error || `HTTP ${response.status}: Не удалось проверить статус платежа`)
      }

      const data = await response.json()
      console.log('Payment status check result:', data)
      
      if (data.success && data.status === 'succeeded') {
        setPaymentStatus('succeeded')
        
        // Получаем данные из metadata платежа
        const eventId = data.metadata?.eventId || searchParams.get('eventId')
        const categoryId = data.metadata?.categoryId || searchParams.get('categoryId')
        const quantity = parseInt(data.metadata?.quantity || searchParams.get('quantity') || '1')
        
        if (!eventId || !categoryId) {
          setError('Не найдены данные о мероприятии. Обратитесь в поддержку.')
          setLoading(false)
          return
        }
        
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
        const ticketUrl = `/ticket/${firstTicketId}?category=${categoryId}&quantity=${quantity}&eventId=${eventId}&tickets=${ticketIds.join(',')}`
        console.log('Redirecting to ticket:', ticketUrl)
        
        // Очищаем сохраненный payment_id
        localStorage.removeItem('lastPaymentId')
        
        navigate(ticketUrl, { replace: true })
      } else if (data.status === 'canceled') {
        setPaymentStatus('canceled')
        setLoading(false)
      } else {
        setPaymentStatus('pending')
        // Повторяем проверку через 2 секунды (максимум 15 попыток)
        const attempts = parseInt(searchParams.get('attempts') || '0')
        if (attempts < 15) {
          setTimeout(() => {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set('attempts', (attempts + 1).toString())
            if (actualPaymentId) {
              newSearchParams.set('payment_id', actualPaymentId)
            }
            window.location.search = newSearchParams.toString()
          }, 2000)
        } else {
          setError('Превышено время ожидания подтверждения платежа. Проверьте статус платежа в личном кабинете.')
          setLoading(false)
        }
      }
    } catch (err) {
      console.error('Ошибка проверки платежа:', err)
      setError(err.message || 'Ошибка при проверке статуса платежа')
      setLoading(false)
    }
  }

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
