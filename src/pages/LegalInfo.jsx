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

  // Список документов
  const documents = [
    {
      id: 'offer',
      title: 'Публичная оферта',
      description: 'Договор публичной оферты на продажу билетов',
      url: '/documents/02_Публичная_оферта_билеты_Tupik_Нева_Пульс.pdf'
    },
    {
      id: 'refund',
      title: 'Политика возврата',
      description: 'Условия возврата билетов',
      url: '/documents/03_Политика_возврата_билетов_Tupik_Нева_Пульс.pdf'
    },
    {
      id: 'privacy',
      title: 'Политика обработки персональных данных',
      description: 'Как мы обрабатываем ваши персональные данные',
      url: '/documents/04_Политика_ПДн_Tupik_Нева_Пульс.pdf'
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
            <span className="info-value">help@tupik.xyz</span>
          </div>
          <div className="info-row">
            <span className="info-label">Телефон:</span>
            <span className="info-value">+7 (812) 456-78-90</span>
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
            <span className="info-label">Название организации:</span>
            <span className="info-value">ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "НЕВА ПУЛЬС"</span>
          </div>
          <div className="info-row">
            <span className="info-label">Юридический адрес:</span>
            <span className="info-value">197374, РОССИЯ, Г.САНКТ-ПЕТЕРБУРГ, ВН.ТЕР.Г. МУНИЦИПАЛЬНЫЙ ОКРУГ ОЗЕРО ДОЛГОЕ, ДОР ТОРФЯНАЯ, Д. 17, К. 1, СТР. 1, КВ. 69</span>
          </div>
          <div className="info-row">
            <span className="info-label">ИНН:</span>
            <span className="info-value">7814854075</span>
          </div>
          <div className="info-row">
            <span className="info-label">КПП:</span>
            <span className="info-value">781401001</span>
          </div>
          <div className="info-row">
            <span className="info-label">ОГРН:</span>
            <span className="info-value">1257800065148</span>
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
