import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './TicketSelection.css'

function TicketSelection({ webApp, config }) {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)

  const category = config.ticketCategories.find(cat => cat.id === categoryId)

  if (!category || !category.available) {
    return (
      <div className="error-container">
        <p>Категория билетов недоступна</p>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться назад
        </button>
      </div>
    )
  }

  const totalPrice = category.price * quantity

  const handlePurchase = () => {
    navigate(`/payment/${categoryId}?quantity=${quantity}`)
  }

  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta))
    setQuantity(newQuantity)
  }

  return (
    <div className="selection-container">
      <div className="selection-header">
        <h2 className="selection-title">{category.name}</h2>
        <p className="selection-description">{category.description}</p>
      </div>

      <div className="quantity-section">
        <label className="quantity-label">Количество билетов</label>
        <div className="quantity-controls">
          <button
            className="quantity-button"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            −
          </button>
          <span className="quantity-value">{quantity}</span>
          <button
            className="quantity-button"
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= 10}
          >
            +
          </button>
        </div>
      </div>

      <div className="price-section">
        <div className="price-row">
          <span>Цена за билет:</span>
          <span className="price-value">{category.price} ₽</span>
        </div>
        <div className="price-row total">
          <span>Итого:</span>
          <span className="price-value total-price">{totalPrice} ₽</span>
        </div>
      </div>

      <button className="purchase-button" onClick={handlePurchase}>
        Перейти к оплате
      </button>
    </div>
  )
}

export default TicketSelection
