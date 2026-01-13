import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
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

  const handleAddToWallet = () => {
    // Генерируем PKPass для Apple Wallet
    // В реальном приложении это должно быть на бэкенде
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.ticketstory.event',
      serialNumber: currentTicketId,
      teamIdentifier: 'YOUR_TEAM_ID',
      organizationName: 'Ticket Story',
      description: event?.name || 'Билет на мероприятие',
      logoText: 'Ticket',
      foregroundColor: 'rgb(0, 168, 255)',
      backgroundColor: 'rgb(10, 10, 10)',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'Мероприятие',
            value: event?.name || ''
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'Дата',
            value: event?.date || ''
          },
          {
            key: 'time',
            label: 'Время',
            value: event?.time || ''
          }
        ],
        auxiliaryFields: [
          {
            key: 'venue',
            label: 'Место',
            value: event?.venue || ''
          },
          {
            key: 'category',
            label: 'Категория',
            value: category?.name || ''
          }
        ],
        barcode: {
          message: JSON.stringify({
            ticketId: currentTicketId,
            category: categoryId,
            event: event?.name,
            eventId: event?.id,
            date: event?.date
          }),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1'
        }
      }
    }

    // Для Apple Wallet нужен подписанный .pkpass файл
    // Это требует серверной части. Пока показываем инструкцию
    if (webApp) {
      webApp.showAlert('Для добавления в Apple Wallet нужна серверная подпись. Используйте функцию "Сохранить как фото" для сохранения билета.')
    } else {
      alert('Для добавления в Apple Wallet нужна серверная подпись. Используйте функцию "Сохранить как фото" для сохранения билета.')
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
        <button className="wallet-button" onClick={handleAddToWallet}>
          🎫 Добавить в Apple Wallet
        </button>
      </div>
    </div>
  )
}

export default TicketView
