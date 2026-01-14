import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <Link to="/legal" className="footer-link">
          Юридическая информация
        </Link>
      </div>
    </footer>
  )
}

export default Footer
