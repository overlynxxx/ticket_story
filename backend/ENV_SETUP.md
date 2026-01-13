# Настройка переменных окружения

Создайте файл `.env` в папке `backend/` со следующим содержимым:

```env
# ЮКасса
YOOKASSA_SHOP_ID=1248098
YOOKASSA_SECRET_KEY=test_44nfjs8TvfyAWb77UlYIUU5kGUB28f-gITBPdKVyKpE

# Порт сервера
PORT=3001

# URL для возврата после оплаты
RETURN_URL=http://localhost:3000/payment-success
```

## Для продакшена:

Замените тестовые ключи на продакшен:
```env
YOOKASSA_SHOP_ID=your_production_shop_id
YOOKASSA_SECRET_KEY=your_production_secret_key
RETURN_URL=https://your-domain.com/payment-success
```
