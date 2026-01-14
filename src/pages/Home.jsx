import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import './Home.css'

function Home({ webApp, config }) {
  const navigate = useNavigate()
  const [selectedEventId, setSelectedEventId] = useState(null)

  // Находим ближайшее мероприятие (по дате)
  const nearestEvent = useMemo(() => {
    if (!config.events || config.events.length === 0) return null
    
    const now = new Date()
    const upcomingEvents = config.events
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    
    return upcomingEvents.length > 0 ? upcomingEvents[0] : config.events[0]
  }, [config.events])

  // Все мероприятия, отсортированные по дате
  const allEvents = useMemo(() => {
    if (!config.events) return []
    return [...config.events].sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [config.events])

  const handleEventSelect = (eventId) => {
    setSelectedEventId(eventId)
    // Переходим на детальную страницу мероприятия
    navigate(`/event/${eventId}`)
  }

  if (!nearestEvent) {
    return (
      <div className="home-container">
        <div className="error-container">
          <p>Нет доступных мероприятий</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      {/* Плашка "Ближайшее мероприятие" */}
      <div className="nearest-event-banner">
        <div className="banner-label">БЛИЖАЙШЕЕ МЕРОПРИЯТИЕ</div>
        <div className="nearest-event-card" onClick={() => handleEventSelect(nearestEvent.id)}>
          <div className="nearest-event-header">
            <h2 className="nearest-event-title">{nearestEvent.name}</h2>
            <div className="nearest-event-badge">🔥</div>
          </div>
          <div className="nearest-event-artists">{nearestEvent.artists}</div>
          <div className="nearest-event-info">
            <div className="nearest-event-date">
              <span className="info-icon">🗓</span>
              <span>{nearestEvent.date.split('-').reverse().join('.')}</span>
            </div>
            <div className="nearest-event-time">
              <span className="info-icon">🕕</span>
              <span>{nearestEvent.time}</span>
            </div>
            <div className="nearest-event-venue">
              <span className="info-icon">📍</span>
              <span>{nearestEvent.venue}</span>
            </div>
          </div>
          <div className="nearest-event-action">
            <span className="action-text">Купить билеты</span>
            <span className="action-arrow">→</span>
          </div>
        </div>
      </div>

      {/* Список всех мероприятий */}
      <div className="all-events-section">
        <h2 className="section-title-neon">Все мероприятия</h2>
        <div className="events-list">
          {allEvents.map((event) => {
            const isNearest = event.id === nearestEvent.id
            return (
              <div
                key={event.id}
                className={`event-card ${isNearest ? 'nearest' : ''}`}
                onClick={() => handleEventSelect(event.id)}
              >
                <div className="event-card-header">
                  <div className="event-card-title-section">
                    <h3 className="event-card-title">{event.name}</h3>
                    {isNearest && <span className="event-badge">Ближайшее</span>}
                  </div>
                  <div className="event-card-arrow">→</div>
                </div>
                <div className="event-card-artists">{event.artists}</div>
                <div className="event-card-details">
                  <div className="event-card-detail">
                    <span className="detail-icon">🗓</span>
                    <span>{event.date.split('-').reverse().join('.')}</span>
                  </div>
                  <div className="event-card-detail">
                    <span className="detail-icon">🕕</span>
                    <span>{event.time}</span>
                  </div>
                  <div className="event-card-detail">
                    <span className="detail-icon">📍</span>
                    <span>{event.venue}</span>
                  </div>
                </div>
                {event.description && (
                  <div className="event-card-description">{event.description}</div>
                )}
                {event.ticketCategories && event.ticketCategories.length > 0 && (
                  <div className="event-card-tickets">
                    <span className="tickets-label">Билеты от</span>
                    <span className="tickets-price">
                      {Math.min(...event.ticketCategories.map(c => c.price))} ₽
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default Home
