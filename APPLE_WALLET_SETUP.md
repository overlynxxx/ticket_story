# 🎫 Настройка Apple Wallet для билетов

## Что нужно для работы Apple Wallet

1. **Apple Developer аккаунт** (стоимость: $99/год)
2. **Pass Type ID** (создается в Apple Developer Portal)
3. **Сертификат для подписи** (.p12 файл)
4. **WWDR сертификат** (Apple Worldwide Developer Relations)

## Пошаговая инструкция

### Шаг 1: Регистрация в Apple Developer

1. Зайдите на [developer.apple.com](https://developer.apple.com)
2. Зарегистрируйтесь или войдите в аккаунт
3. Оплатите годовую подписку ($99)

### Шаг 2: Создание Pass Type ID

1. В Apple Developer Portal перейдите в **Certificates, Identifiers & Profiles**
2. Выберите **Identifiers** → **+** (добавить)
3. Выберите **Pass Type IDs**
4. Создайте новый Pass Type ID (например: `pass.com.ticketstory.event`)
5. Запишите этот ID - он понадобится для настройки

### Шаг 3: Создание сертификата

1. В том же разделе выберите ваш Pass Type ID
2. Нажмите **Configure**
3. Создайте **Certificate** для подписи
4. Скачайте сертификат и установите его в Keychain (macOS)
5. Экспортируйте сертификат в .p12 формат с паролем

### Шаг 4: Скачивание WWDR сертификата

1. Скачайте [WWDR сертификат](https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer)
2. Сохраните его как `wwdr.pem`

### Шаг 5: Установка библиотеки

```bash
cd api
npm install passkit-generator
```

### Шаг 6: Настройка переменных окружения

В Vercel добавьте следующие переменные:

```
APPLE_PASS_TYPE_ID=pass.com.ticketstory.event
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_ORG_NAME=Your Organization Name
APPLE_CERT_PASSWORD=password_from_p12_file
```

### Шаг 7: Загрузка сертификатов

**ВАЖНО:** Сертификаты должны быть загружены в безопасное хранилище (не в Git!)

Варианты:
1. Использовать Vercel Environment Variables для закодированных в base64 сертификатов
2. Использовать внешнее хранилище (AWS S3, Google Cloud Storage)
3. Использовать секреты Vercel

### Шаг 8: Обновление кода

После настройки обновите `api/ticket/[ticketId]/wallet.js`:

```javascript
const { PKPass } = require('passkit-generator');

// Загрузите сертификаты из безопасного хранилища
const pass = new PKPass(passData, {
  model: './path/to/pass-template', // Опционально: шаблон дизайна
  certificates: {
    wwdr: Buffer.from(process.env.APPLE_WWDR_CERT, 'base64'),
    signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT, 'base64'),
    signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY, 'base64'),
    signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD
  }
});

const buffer = pass.getAsBuffer();
res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pkpass"`);
res.send(buffer);
```

## Альтернативный вариант (без Apple Developer)

Если у вас нет Apple Developer аккаунта, можно:

1. **Использовать только сохранение фото** - уже реализовано
2. **Использовать Google Pay Passes** - аналогичный функционал для Android
3. **Использовать сторонние сервисы** (например, PassSlot, PassKit.com)

## Полезные ссылки

- [Apple Wallet Documentation](https://developer.apple.com/documentation/walletpasses)
- [Passkit Generator (npm)](https://www.npmjs.com/package/passkit-generator)
- [Apple Developer Portal](https://developer.apple.com/account/)

## Текущий статус

✅ Структура pass файла готова  
✅ API endpoint создан  
⏳ Требуется настройка сертификатов Apple  
⏳ Требуется установка библиотеки passkit-generator  

---

**Примечание:** Пока Apple Wallet не настроен, пользователи могут использовать функцию "Сохранить как фото" для сохранения билетов.
