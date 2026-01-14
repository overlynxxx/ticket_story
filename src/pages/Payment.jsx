import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PaymentQR from '../components/PaymentQR'
import Footer from '../components/Footer'
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
  const [email, setEmail] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Находим мероприятие
  const event = eventId 
    ? config.events?.find(e => e.id === eventId)
    : config.events?.[0] // Для обратной совместимости

  // Находим категорию билетов
  const category = event?.ticketCategories?.find(cat => cat.id === categoryId)
  const totalPrice = category ? category.price * quantity : 0

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handlePayment = async () => {
    if (isProcessing) return

    // Валидация email
    if (!email || !email.trim()) {
      setEmailError('Введите email адрес')
      if (webApp) {
        webApp.showAlert('Пожалуйста, введите email адрес')
      } else {
        alert('Пожалуйста, введите email адрес')
      }
      return
    }

    if (!validateEmail(email)) {
      setEmailError('Введите корректный email адрес')
      if (webApp) {
        webApp.showAlert('Пожалуйста, введите корректный email адрес')
      } else {
        alert('Пожалуйста, введите корректный email адрес')
      }
      return
    }

    // Проверка согласия
    if (!consentChecked) {
      if (webApp) {
        webApp.showAlert('Необходимо согласие на обработку персональных данных')
      } else {
        alert('Необходимо согласие на обработку персональных данных')
      }
      return
    }

    // Если цена 0 (бесплатный билет), сразу выдаем билет
    if (totalPrice === 0) {
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const currentEventId = eventId || event?.id
      navigate(`/ticket/${ticketId}?category=${categoryId}&quantity=${quantity}&eventId=${currentEventId}`)
      return
    }

    setIsProcessing(true)
    setEmailError('')

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

        console.log('Creating payment, API_URL:', API_URL)
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
            userId: userId,
            email: email.trim()
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Проверяем Content-Type перед парсингом JSON
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          const text = await response.text()
          console.error('Non-JSON response from create-payment:', {
            status: response.status,
            statusText: response.statusText,
            contentType: contentType,
            textPreview: text.substring(0, 200),
            url: `${API_URL}/api/create-payment`
          })
          // Если это HTML (404 страница), даем более понятное сообщение
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error('API endpoint не найден. Проверьте, что сервер развернут корректно.')
          }
          throw new Error(`Сервер вернул неверный формат ответа (${contentType || 'не указан'}). Проверьте, что API работает корректно.`)
        }

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

          // Сохраняем paymentId в localStorage для случая, если return_url не сработает
          localStorage.setItem('lastPaymentId', data.paymentId)
          localStorage.setItem('lastPaymentData', JSON.stringify({
            eventId: currentEventId,
            categoryId: categoryId,
            quantity: quantity
          }))

          // Для СБП используем confirmation_url - это страница ЮКассы с QR-кодом
          // На странице пользователь увидит QR-код (на компьютере) или список банков (на мобильном)
          // После оплаты пользователь автоматически вернется на return_url, где произойдет проверка и перенаправление на билеты
          
          // В Telegram Mini App используем openLink для открытия в браузере (чтобы можно было выбрать банк)
          // В обычном браузере используем window.location.href
          if (webApp && webApp.openLink) {
            try {
              webApp.openLink(data.confirmationUrl)
            } catch (e) {
              // Если openLink не поддерживается, используем обычный редирект
              console.warn('openLink not supported, using location.href:', e)
              window.location.href = data.confirmationUrl
            }
          } else {
            window.location.href = data.confirmationUrl
          }

          // Сохраняем данные платежа для проверки статуса
          setPaymentData({
            paymentId: data.paymentId,
            paymentUrl: data.confirmationUrl,
            amount: totalPrice
          })

          setIsProcessing(false)
          
          // Не показываем сообщение - все происходит автоматически
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
      const isDisabled = !email.trim() || !validateEmail(email) || !consentChecked
      
      webApp.MainButton.setText(buttonText)
      if (isDisabled || isProcessing) {
        webApp.MainButton.disable()
      } else {
        webApp.MainButton.enable()
      }
      webApp.MainButton.show()
      webApp.MainButton.onClick(handlePayment)
      return () => {
        webApp.MainButton.hide()
        webApp.MainButton.offClick(handlePayment)
      }
    }
  }, [webApp, totalPrice, isProcessing, email, consentChecked])

  if (!event) {
    return (
      <div className="error-container">
        <p>Мероприятие не найдено</p>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться назад
        </button>
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

      {/* Форма ввода email и согласия */}
      <div className="payment-form-section">
        <h3 className="form-section-title">Контактные данные</h3>
        
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email адрес <span className="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            className={`form-input ${emailError ? 'error' : ''}`}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError('')
            }}
            disabled={isProcessing}
          />
          {emailError && <span className="error-message">{emailError}</span>}
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              disabled={isProcessing}
            />
            <span className="checkbox-text">
              Я согласен на обработку персональных данных <span className="required">*</span>
            </span>
          </label>
        </div>
      </div>

      {/* Кнопка оплаты - показываем только если НЕ в Telegram (в Telegram используется MainButton) */}
      {/* Проверяем, что мы действительно в Telegram Mini App, а не просто есть объект webApp */}
      {(!webApp || !window.Telegram?.WebApp?.initData) && (
        <button 
          className="payment-button" 
          onClick={handlePayment}
          disabled={isProcessing || !email.trim() || !validateEmail(email) || !consentChecked}
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
