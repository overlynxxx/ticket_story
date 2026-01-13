import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import TicketSelection from './pages/TicketSelection'
import Payment from './pages/Payment'
import TicketView from './pages/TicketView'
import PaymentSuccess from './pages/PaymentSuccess'
import ticketsConfig from '../config/tickets.json'

function App() {
  const [webApp, setWebApp] = useState(null)

  useEffect(() => {
    // Инициализация Telegram Web App
    // Проверяем, что мы действительно в Telegram Mini App (есть initData)
    if (window.Telegram?.WebApp && window.Telegram.WebApp.initData) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      setWebApp(tg)
    } else {
      // Для разработки вне Telegram
      setWebApp(null)
      if (process.env.NODE_ENV === 'development') {
        console.log('Telegram WebApp не обнаружен, работаем в режиме разработки')
      }
    }
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home webApp={webApp} config={ticketsConfig} />} />
        <Route path="/event/:eventId" element={<EventDetail webApp={webApp} config={ticketsConfig} />} />
        <Route path="/event/:eventId/select/:categoryId" element={<TicketSelection webApp={webApp} config={ticketsConfig} />} />
        <Route path="/event/:eventId/payment/:categoryId" element={<Payment webApp={webApp} config={ticketsConfig} />} />
        <Route path="/ticket/:ticketId" element={<TicketView webApp={webApp} config={ticketsConfig} />} />
        <Route path="/payment-success" element={<PaymentSuccess webApp={webApp} config={ticketsConfig} />} />
        {/* Старые маршруты для обратной совместимости */}
        <Route path="/select/:categoryId" element={<TicketSelection webApp={webApp} config={ticketsConfig} />} />
        <Route path="/payment/:categoryId" element={<Payment webApp={webApp} config={ticketsConfig} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
