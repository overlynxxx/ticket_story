# Инструкция по добавлению афиши

## Как добавить изображение афиши:

1. Поместите файл афиши в папку `public/` с именем `poster.jpg` или `poster.png`

2. Обновите файл `src/pages/Home.jsx`:

Замените блок `.poster-image` на:

```jsx
<div className="poster-image" style={{
  backgroundImage: 'url(/poster.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}}>
  <div className="poster-overlay">
    {/* ... остальной код ... */}
  </div>
</div>
```

Или используйте тег `<img>`:

```jsx
<div className="poster-container">
  <img 
    src="/poster.jpg" 
    alt="Афиша концерта" 
    className="poster-image"
    style={{ width: '100%', height: 'auto', display: 'block' }}
  />
  <div className="poster-overlay">
    {/* ... остальной код ... */}
  </div>
</div>
```

## Рекомендации:

- Формат: JPG или PNG
- Размер: рекомендуется 1200x1600px или больше
- Вес: оптимизируйте изображение (до 500KB для быстрой загрузки)
