/**
 * Утилита для определения URL API
 * Автоматически определяет, использовать ли локальный бэкенд или Vercel
 */

// Определяем URL API
export function getApiUrl() {
  // Если указан в переменных окружения
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // Если приложение задеплоено на Vercel, используем тот же домен
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const origin = window.location.origin
    
    // Если на Vercel домене или в продакшене
    if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
      // Используем пустую строку для относительных путей (API на том же домене)
      return ''
    }
    
    // Если на кастомном домене (предполагаем, что API на том же домене)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '' // Относительные пути работают лучше
    }
  }

  // По умолчанию локальный бэкенд
  return 'http://localhost:3001'
}

export const API_URL = getApiUrl()
