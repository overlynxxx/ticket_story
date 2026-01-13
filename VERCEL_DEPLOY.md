# 🚀 Деплой бэкенда на Vercel

## Быстрый старт

### 1. Установите Vercel CLI

```bash
npm install -g vercel
```

### 2. Войдите в Vercel

```bash
vercel login
```

### 3. Добавьте переменные окружения

```bash
# Добавьте секреты в Vercel
vercel env add YOOKASSA_SHOP_ID
# Введите: 1248098

vercel env add YOOKASSA_SECRET_KEY
# Введите: test_44nfjs8TvfyAWb77UlYIUU5kGUB28f-gITBPdKVyKpE
```

Или через веб-интерфейс:
1. Зайдите на [vercel.com](https://vercel.com)
2. Выберите ваш проект
3. Settings → Environment Variables
4. Добавьте:
   - `YOOKASSA_SHOP_ID` = `1248098`
   - `YOOKASSA_SECRET_KEY` = `test_44nfjs8TvfyAWb77UlYIUU5kGUB28f-gITBPdKVyKpE`

### 4. Деплой

```bash
vercel
```

Или через GitHub:
1. Подключите репозиторий к Vercel
2. Vercel автоматически задеплоит при каждом push

## Структура API на Vercel

API endpoints доступны по адресу:
- `https://your-app.vercel.app/api/create-payment`
- `https://your-app.vercel.app/api/payment/[paymentId]/status`
- `https://your-app.vercel.app/api/payment-webhook`
- `https://your-app.vercel.app/api/events`
- `https://your-app.vercel.app/api/health`

## Настройка фронтенда

Обновите `src/pages/Payment.jsx`:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://your-app.vercel.app'
```

Или создайте `.env` файл:
```
REACT_APP_API_URL=https://your-app.vercel.app
```

## Настройка Webhook

1. Получите URL вашего Vercel проекта
2. Зайдите в личный кабинет ЮКассы
3. Настройки магазина → Webhook
4. URL: `https://your-app.vercel.app/api/payment-webhook`

## Важно

⚠️ **Для продакшена:**
- Используйте продакшен ключи ЮКассы
- Настройте переменные окружения в Vercel
- Используйте HTTPS (Vercel предоставляет автоматически)
- Настройте webhook для обработки платежей

## Проверка работы

После деплоя проверьте:
```bash
curl https://your-app.vercel.app/api/health
```

Должен вернуть:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "..."
}
```
