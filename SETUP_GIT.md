# Быстрая настройка Git и GitHub

## Шаг 1: Проверка текущего статуса

```bash
git status
```

## Шаг 2: Создание репозитория на GitHub

1. Перейдите на [github.com](https://github.com)
2. Нажмите "New repository"
3. Название: `ticket_story` (или любое другое)
4. **НЕ** создавайте README, .gitignore или лицензию (они уже есть)
5. Нажмите "Create repository"

## Шаг 3: Подключение к GitHub

Замените `ВАШ_USERNAME` на ваш GitHub username:

```bash
git remote add origin https://github.com/ВАШ_USERNAME/ticket_story.git
git branch -M main
git push -u origin main
```

Если репозиторий уже существует и вы хотите перезаписать:

```bash
git remote set-url origin https://github.com/ВАШ_USERNAME/ticket_story.git
git push -u origin main --force
```

## Шаг 4: Проверка

Откройте ваш репозиторий на GitHub - все файлы должны быть там!

## Шаг 5: Настройка автоматического деплоя

См. файл [.github/DEPLOY.md](.github/DEPLOY.md) для инструкций по настройке:
- GitHub Pages
- Vercel (рекомендуется)
- Netlify

## Дальнейшая работа

После настройки, для обновления кода на GitHub:

```bash
# Автоматический способ
npm run deploy

# Или вручную
git add .
git commit -m "Описание изменений"
git push
```

## Полезные команды

```bash
# Проверить статус
git status

# Посмотреть историю коммитов
git log

# Посмотреть подключенные репозитории
git remote -v

# Отменить последний коммит (но оставить изменения)
git reset --soft HEAD~1

# Отменить все незакоммиченные изменения
git reset --hard
```
