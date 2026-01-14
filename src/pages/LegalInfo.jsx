import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LegalInfo.css'

function LegalInfo({ webApp }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (webApp) {
      webApp.MainButton.hide()
      webApp.BackButton.show()
      webApp.BackButton.onClick(() => {
        navigate(-1)
      })
    }
  }, [webApp, navigate])

  // Список документов (можно расширить)
  const documents = [
    {
      id: 'terms',
      title: 'Пользовательское соглашение',
      description: 'Условия использования сервиса',
      url: '/documents/terms.pdf' // Замените на реальный URL
    },
    {
      id: 'privacy',
      title: 'Политика конфиденциальности',
      description: 'Как мы обрабатываем ваши данные',
      url: '/documents/privacy.pdf' // Замените на реальный URL
    },
    {
      id: 'refund',
      title: 'Правила возврата',
      description: 'Условия возврата билетов',
      url: '/documents/refund.pdf' // Замените на реальный URL
    },
    {
      id: 'offer',
      title: 'Публичная оферта',
      description: 'Договор публичной оферты',
      url: '/documents/offer.pdf' // Замените на реальный URL
    }
  ]

  const handleDocumentClick = (url) => {
    // Открываем документ в новой вкладке
    window.open(url, '_blank')
  }

  return (
    <div className="legal-info-container">
      <div className="legal-header">
        <h1 className="legal-title">Юридическая информация</h1>
        <p className="legal-subtitle">
          Документы и правовая информация о сервисе продажи билетов
        </p>
      </div>

      <div className="documents-section">
        <h2 className="section-title">Документы</h2>
        <div className="documents-list">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="document-card"
              onClick={() => handleDocumentClick(doc.url)}
            >
              <div className="document-icon">📄</div>
              <div className="document-content">
                <h3 className="document-title">{doc.title}</h3>
                <p className="document-description">{doc.description}</p>
              </div>
              <div className="document-arrow">→</div>
            </div>
          ))}
        </div>
      </div>

      <div className="legal-info-section">
        <h2 className="section-title">Контактная информация</h2>
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">support@example.com</span>
          </div>
          <div className="info-row">
            <span className="info-label">Телефон:</span>
            <span className="info-value">+7 (XXX) XXX-XX-XX</span>
          </div>
          <div className="info-row">
            <span className="info-label">Время работы:</span>
            <span className="info-value">Пн-Пт: 10:00 - 20:00</span>
          </div>
        </div>
      </div>

      <div className="legal-info-section">
        <h2 className="section-title">Реквизиты</h2>
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Организация:</span>
            <span className="info-value">ООО "Пример"</span>
          </div>
          <div className="info-row">
            <span className="info-label">ИНН:</span>
            <span className="info-value">615527490218</span>
          </div>
          <div className="info-row">
            <span className="info-label">ОГРН:</span>
            <span className="info-value">1234567890123</span>
          </div>
          <div className="info-row">
            <span className="info-label">Адрес:</span>
            <span className="info-value">г. Санкт-Петербург, ул. Примерная, д. 1</span>
          </div>
        </div>
      </div>

      <button 
        className="back-button" 
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>
    </div>
  )
}

export default LegalInfo
