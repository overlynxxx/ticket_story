import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import './TicketView.css'

function TicketView({ webApp, config }) {
  const { ticketId } = useParams()
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('category')
  const eventId = searchParams.get('eventId')
  const quantity = parseInt(searchParams.get('quantity') || '1')
  const [ticketData, setTicketData] = useState(null)

  // Находим мероприятие
  const event = eventId 
    ? config.events?.find(e => e.id === eventId)
    : config.events?.[0] // Для обратной совместимости

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
    if (ticketId && category && event) {
      setTicketData({
        id: ticketId,
        category: category.name,
        price: category.price,
        quantity: quantity,
        eventName: event.name,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        purchaseDate: new Date().toLocaleDateString('ru-RU'),
        purchaseTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      })
    }
  }, [ticketId, category, event, quantity, webApp])

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
    ticketId: ticketData.id,
    category: categoryId,
    quantity: quantity,
    event: event.name,
    eventId: event.id,
    date: event.date
  })

  return (
    <div className="ticket-view-container">
      <div className="ticket-card-view">
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
            <span className="detail-label">Количество:</span>
            <span className="detail-value">{ticketData.quantity}</span>
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
    </div>
  )
}

export default TicketView
