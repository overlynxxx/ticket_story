import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import './EventDetail.css'

function EventDetail({ webApp, config }) {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Находим мероприятие
  const event = useMemo(() => {
    return config.events?.find(e => e.id === eventId)
  }, [config.events, eventId])

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId)
    navigate(`/event/${eventId}/select/${categoryId}`)
  }

  if (!event) {
    return (
      <div className="event-detail-container">
        <div className="error-container">
          <p>Мероприятие не найдено</p>
          <button onClick={() => navigate('/')} className="back-button">
            Вернуться назад
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="event-detail-container">
      {/* Афиша */}
      <div className="poster-container">
        <div 
          className="poster-image"
          style={{
            // Раскомментируйте следующую строку и укажите путь к вашему изображению:
            // backgroundImage: 'url(/poster.jpg)',
          }}
        >
          <div className="poster-overlay">
            <div className="poster-content">
              <div className="poster-label">КОНЦЕРТ</div>
              <h1 className="poster-title">
                <span className="title-blue">{event.name}</span>
              </h1>
              <div className="poster-artists">{event.artists}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Основная информация о событии */}
      <div className="event-main-info">
        <div className="event-date-time">
          <span className="date">🗓 {event.date.split('-').reverse().join('.')}</span>
          <span className="separator">•</span>
          <span className="venue">«{event.venue}»</span>
          <span className="separator">•</span>
          <span className="time">🕕 {event.time}</span>
          {event.endTime && (
            <>
              <span className="separator">•</span>
              <span className="end-time">— {event.endTime}</span>
            </>
          )}
        </div>
        <div className="event-address">📍 {event.address}</div>
      </div>

      {/* Описание события */}
      {event.description && (
        <div className="event-description-section">
          <h2 className="section-title-neon">{event.description}</h2>
          {event.battleInfo && (
            <>
              <p className="description-text">
                {event.battleInfo.description} 🎉
              </p>
              {event.battleInfo.judges && (
                <p className="judges-text">
                  Судить будут легенды – <strong>{event.battleInfo.judges}</strong> 😎
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Призы (если есть) */}
      {event.battleInfo && event.battleInfo.prizes && event.battleInfo.prizes.length > 0 && (
        <div className="prizes-section">
          <h3 className="prizes-title">Призы:</h3>
          <div className="prizes-list">
            {event.battleInfo.prizes.map((prize, index) => (
              <div key={index} className="prize-item">
                <div className="prize-place">{prize.place}</div>
                <div className="prize-description">{prize.prize}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ведущий (если есть) */}
      {event.host && (
        <div className="host-section">
          <div className="host-label">🎙 Ведущий</div>
          <div className="host-name">— {event.host}</div>
        </div>
      )}

      {/* Категории билетов */}
      {event.ticketCategories && event.ticketCategories.length > 0 && (
        <div className="tickets-section">
          <h2 className="section-title-neon tickets-title">Выберите категорию билета</h2>
          <div className="ticket-categories">
            {event.ticketCategories.map((category) => (
              <div
                key={category.id}
                className={`ticket-card ${!category.available ? 'disabled' : ''}`}
                onClick={() => category.available && handleCategorySelect(category.id)}
              >
                <div className="ticket-card-header">
                  <h3 className="ticket-category-name">{category.name}</h3>
                  <span className="ticket-price">
                    {category.price === 0 ? 'Бесплатно' : `${category.price} ₽`}
                  </span>
                </div>
                <p className="ticket-description">{category.description}</p>
                {!category.available && (
                  <span className="ticket-unavailable">Недоступно</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default EventDetail
