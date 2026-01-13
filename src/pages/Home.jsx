import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
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
                <span className="title-blue">LIVE IN</span>{' '}
                <span className="title-red">TUPIK</span>
              </h1>
              <div className="poster-artists">{config.event.artists}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Основная информация о событии */}
      <div className="event-main-info">
        <div className="event-date-time">
          <span className="date">🗓 {config.event.date.split('-').reverse().join('.')}</span>
          <span className="separator">•</span>
          <span className="venue">«{config.event.venue}»</span>
          <span className="separator">•</span>
          <span className="time">🕕 {config.event.time}</span>
        </div>
        <div className="event-address">📍 {config.event.address}</div>
      </div>

      {/* Описание события */}
      <div className="event-description-section">
        <h2 className="section-title-neon">{config.event.description}</h2>
        <p className="description-text">
          {config.event.battleInfo.description} 🎉
        </p>
        <p className="judges-text">
          Судить будут легенды – <strong>{config.event.battleInfo.judges}</strong> 😎
        </p>
      </div>

      {/* Призы */}
      <div className="prizes-section">
        <h3 className="prizes-title">Призы:</h3>
        <div className="prizes-list">
          {config.event.battleInfo.prizes.map((prize, index) => (
            <div key={index} className="prize-item">
              <div className="prize-place">{prize.place}</div>
              <div className="prize-description">{prize.prize}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ведущий */}
      <div className="host-section">
        <div className="host-label">🎙 Ведущий</div>
        <div className="host-name">— {config.event.host}</div>
      </div>

      {/* Категории билетов */}
      <div className="tickets-section">
        <h2 className="section-title-neon tickets-title">Выберите категорию билета</h2>
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
      <Footer />
    </div>
  )
}

export default Home
