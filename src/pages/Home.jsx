import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home({ webApp, config }) {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState(null)

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId)
    navigate(`/select/${categoryId}`)
  }

  return (
    <div className="home-container">
      {/* Афиша */}
      <div className="poster-container">
        <div className="poster-background">
          <div className="poster-content">
            <div className="poster-label">КОНЦЕРТ</div>
            <h1 className="poster-title">
              <span className="title-blue">LIVE IN</span>
              <span className="title-red"> TUPIK</span>
            </h1>
            <div className="poster-artists">{config.event.subtitle}</div>
            <div className="poster-date">
              {config.event.date} - «{config.event.venue}» - {config.event.time}
            </div>
            <div className="poster-battle">ОТКРЫТЫЙ БАТТЛ ЗА ГЛАВНЫЙ ПРИЗ</div>
            <div className="poster-host">ВЕДУЩИЙ – {config.event.host}</div>
          </div>
        </div>
      </div>

      {/* Описание события */}
      {config.event.description && (
        <div className="event-description">
          <p className="description-text">{config.event.description}</p>
        </div>
      )}

      {/* Призы */}
      {config.event.prizes && config.event.prizes.length > 0 && (
        <div className="prizes-section">
          <h3 className="prizes-title">Призы:</h3>
          <div className="prizes-list">
            {config.event.prizes.map((prize, index) => (
              <div key={index} className="prize-item">
                <div className="prize-header">
                  <span className="prize-emoji">{prize.place}</span>
                  <span className="prize-title">{prize.title}</span>
                </div>
                <p className="prize-description">{prize.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Информация о событии */}
      <div className="event-details">
        <div className="detail-item">
          <span className="detail-icon">📍</span>
          <span className="detail-text">{config.event.address}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">🗓</span>
          <span className="detail-text">{config.event.date}</span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">🕕</span>
          <span className="detail-text">Начало в {config.event.time}</span>
        </div>
      </div>

      {/* Выбор билетов */}
      <div className="tickets-section">
        <h2 className="section-title">Выберите категорию билета</h2>
        <div className="ticket-categories">
          {config.ticketCategories.map((category) => (
            <div
              key={category.id}
              className={`ticket-card ${!category.available ? 'disabled' : ''}`}
              onClick={() => category.available && handleCategorySelect(category.id)}
            >
              <div className="ticket-card-header">
                <h3 className="ticket-category-name">{category.name}</h3>
                <span className="ticket-price">{category.price} ₽</span>
              </div>
              <p className="ticket-description">{category.description}</p>
              {!category.available && (
                <span className="ticket-unavailable">Недоступно</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
