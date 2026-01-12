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
      <div className="event-header">
        <h1 className="event-title">{config.event.name}</h1>
        <div className="event-info">
          <p className="event-date">📅 {config.event.date}</p>
          <p className="event-time">🕐 {config.event.time}</p>
          <p className="event-venue">📍 {config.event.venue}</p>
        </div>
      </div>

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
