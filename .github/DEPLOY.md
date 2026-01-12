# Инструкция по настройке автоматического деплоя

## Вариант 1: GitHub Pages (Бесплатно)

### Шаг 1: Настройка репозитория

1. Создайте репозиторий на GitHub
2. Подключите локальный репозиторий:
   ```bash
   git remote add origin https://github.com/ВАШ_USERNAME/ticket_story.git
   git branch -M main
   git push -u origin main
   ```

### Шаг 2: Включение GitHub Pages

1. Перейдите в Settings → Pages
2. В разделе "Source" выберите "GitHub Actions"
3. Сохраните изменения

### Шаг 3: Автоматический деплой

После настройки каждый push в ветку `main` будет автоматически:
- Собирать проект
- Деплоить на GitHub Pages

URL будет: `https://ВАШ_USERNAME.github.io/ticket_story/`

---

## Вариант 2: Vercel (Рекомендуется для Telegram Mini Apps)

### Шаг 1: Создание проекта на Vercel

1. Зарегистрируйтесь на [Vercel](https://vercel.com)
2. Подключите GitHub репозиторий
3. Vercel автоматически определит настройки

### Шаг 2: Настройка GitHub Actions (опционально)

Если хотите использовать GitHub Actions вместо автоматического деплоя Vercel:

1. Получите Vercel Token:
   - Settings → Tokens → Create Token
2. Добавьте секрет в GitHub:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `VERCEL_TOKEN`
   - Value: ваш токен

### Шаг 3: Автоматический деплой

Vercel автоматически деплоит при каждом push, или используйте GitHub Actions workflow.

---

## Вариант 3: Netlify

### Шаг 1: Создание проекта

1. Зарегистрируйтесь на [Netlify](https://netlify.com)
2. Подключите GitHub репозиторий
3. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Шаг 2: Автоматический деплой

Netlify автоматически деплоит при каждом push в `main`.

---

## Рекомендации для Telegram Mini App

Для Telegram Mini Apps лучше использовать:
- **Vercel** или **Netlify** - быстрый CDN, HTTPS по умолчанию
- **GitHub Pages** - бесплатно, но требует настройки base path

После деплоя:
1. Получите URL вашего приложения
2. Добавьте его в настройки Telegram Bot через [@BotFather](https://t.me/BotFather)
3. Команда: `/newapp` → выберите бота → укажите URL

---

## Автоматический коммит и пуш

Добавьте в `package.json` скрипт:

```json
"scripts": {
  "deploy": "git add . && git commit -m 'Update' && git push"
}
```

Использование:
```bash
npm run deploy
```
