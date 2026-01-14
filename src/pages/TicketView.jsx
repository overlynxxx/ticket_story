import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { API_URL } from '../utils/api'
import './TicketView.css'

function TicketView({ webApp, config }) {
  const { ticketId } = useParams()
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('category')
  const eventId = searchParams.get('eventId')
  const quantity = parseInt(searchParams.get('quantity') || '1')
  const ticketsParam = searchParams.get('tickets')
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0)
  const ticketRef = useRef(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  // Если есть несколько билетов, создаем массив ID
  const ticketIds = ticketsParam 
    ? ticketsParam.split(',').filter(Boolean)
    : [ticketId]
  
  const currentTicketId = ticketIds[currentTicketIndex] || ticketId
  const [ticketData, setTicketData] = useState(null)

  // Находим мероприятие
  const event = eventId 
    ? config.events?.find(e => e.id === eventId)
    : config.events?.[0]

  // Находим категорию билетов
  const category = event?.ticketCategories?.find(cat => cat.id === categoryId)

  useEffect(() => {
    if (webApp) {
      webApp.MainButton.hide()
      webApp.BackButton.show()
      webApp.BackButton.onClick(() => {
        window.location.href = '/'
      })
    }

    // Генерируем данные билета
    if (currentTicketId && category && event) {
      setTicketData({
        id: currentTicketId,
        category: category.name,
        price: category.price,
        quantity: 1, // Для каждого билета количество = 1
        eventName: event.name,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        address: event.address,
        purchaseDate: new Date().toLocaleDateString('ru-RU'),
        purchaseTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      })
    }
  }, [currentTicketId, category, event, webApp])

  const handleSaveAsImage = async () => {
    if (!ticketRef.current) return

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true
      })
      
      const link = document.createElement('a')
      link.download = `ticket-${currentTicketId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Ошибка сохранения изображения:', error)
      alert('Не удалось сохранить билет. Попробуйте еще раз.')
    }
  }

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      alert('Пожалуйста, введите корректный email адрес')
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch(`${API_URL}/api/ticket/${currentTicketId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticketId: currentTicketId,
          email: email,
          eventId: eventId,
          categoryId: categoryId
        })
      })

      const data = await response.json()

      if (data.success) {
        if (webApp) {
          webApp.showAlert('Билет отправлен на email!')
        } else {
          alert('Билет отправлен на email!')
        }
        setShowEmailModal(false)
        setEmail('')
      } else {
        throw new Error(data.error || 'Ошибка отправки email')
      }
    } catch (error) {
      console.error('Ошибка отправки email:', error)
      if (webApp) {
        webApp.showAlert(`Ошибка: ${error.message || 'Не удалось отправить билет на email'}`)
      } else {
        alert(`Ошибка: ${error.message || 'Не удалось отправить билет на email'}`)
      }
    } finally {
      setIsSendingEmail(false)
    }
  }


  const handlePrevTicket = () => {
    if (currentTicketIndex > 0) {
      setCurrentTicketIndex(currentTicketIndex - 1)
    }
  }

  const handleNextTicket = () => {
    if (currentTicketIndex < ticketIds.length - 1) {
      setCurrentTicketIndex(currentTicketIndex + 1)
    }
  }

  if (!event) {
    return (
      <div className="error-container">
        <p>Мероприятие не найдено</p>
      </div>
    )
  }

  if (!ticketData || !category) {
    return (
      <div className="error-container">
        <p>Билет не найден</p>
      </div>
    )
  }

  const qrData = JSON.stringify({
    ticketId: currentTicketId,
    category: categoryId,
    event: event.name,
    eventId: event.id,
    date: event.date
  })

  const hasMultipleTickets = ticketIds.length > 1

  return (
    <div className="ticket-view-container">
      {hasMultipleTickets && (
        <div className="ticket-slider-controls">
          <button 
            className="slider-button prev" 
            onClick={handlePrevTicket}
            disabled={currentTicketIndex === 0}
          >
            ←
          </button>
          <span className="ticket-counter">
            Билет {currentTicketIndex + 1} из {ticketIds.length}
          </span>
          <button 
            className="slider-button next" 
            onClick={handleNextTicket}
            disabled={currentTicketIndex === ticketIds.length - 1}
          >
            →
          </button>
        </div>
      )}

      <div className="ticket-card-view" ref={ticketRef}>
        <div className="ticket-header-view">
          <h2 className="ticket-event-name">{ticketData.eventName}</h2>
          <div className="ticket-qr-container">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        <div className="ticket-details">
          <div className="detail-row">
            <span className="detail-label">Категория:</span>
            <span className="detail-value">{ticketData.category}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Дата мероприятия:</span>
            <span className="detail-value">{ticketData.eventDate}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Время:</span>
            <span className="detail-value">{ticketData.eventTime}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Место:</span>
            <span className="detail-value">{ticketData.eventVenue}</span>
          </div>
          {ticketData.address && (
            <div className="detail-row">
              <span className="detail-label">Адрес:</span>
              <span className="detail-value">{ticketData.address}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">ID билета:</span>
            <span className="detail-value ticket-id">{ticketData.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Дата покупки:</span>
            <span className="detail-value">{ticketData.purchaseDate} {ticketData.purchaseTime}</span>
          </div>
        </div>

        <div className="ticket-footer">
          <p className="ticket-note">
            Предъявите QR-код на входе. Билет действителен только для указанного мероприятия.
          </p>
        </div>
      </div>

      <div className="ticket-actions">
        <button className="save-button" onClick={handleSaveAsImage}>
          📷 Сохранить как фото
        </button>
        <button className="email-button" onClick={() => setShowEmailModal(true)}>
          📧 Отправить на email
        </button>
      </div>

      {showEmailModal && (
        <div className="email-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="email-modal-title">Отправить билет на email</h3>
            <input
              type="email"
              className="email-input"
              placeholder="Введите email адрес"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSendingEmail}
            />
            <div className="email-modal-buttons">
              <button
                className="email-modal-cancel"
                onClick={() => {
                  setShowEmailModal(false)
                  setEmail('')
                }}
                disabled={isSendingEmail}
              >
                Отмена
              </button>
              <button
                className="email-modal-send"
                onClick={handleSendEmail}
                disabled={isSendingEmail || !email}
              >
                {isSendingEmail ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketView
