# KinoLuma snippet SEO fix

Что изменено:

- Усилен SEO title страниц фильмов под запросы вида `смотреть онлайн`.
- Meta description теперь начинается как поисковый сниппет: `Смотреть онлайн ...`, включает год, тип, жанры, страну, описание и KinoLuma.
- В JSON-LD добавлен отдельный `WebPage`-объект с `primaryImageOfPage`.
- В `Movie`/`TVSeries` JSON-LD добавлен `primaryImageOfPage` внутри `mainEntityOfPage`.
- Добавлен `WatchAction` в structured data.
- Open Graph и Twitter images продолжают использовать постер материала.
- Блок похожих материалов на странице фильма теперь подписывается по типу: похожие фильмы, похожие сериалы, похожее аниме и т.д.
- Ссылки похожих материалов получили SEO-friendly `title`.

После замены файлов:

```bash
npm run build
git add .
git commit -m "Improve movie snippets and related movie SEO"
git push origin main
```

После деплоя проверь:

- View Source на `/movie/dune-part-two`: `<title>`, `description`, `og:image`, `application/ld+json`.
- https://validator.schema.org/
- Google Search Console → URL Inspection → Test live URL.
