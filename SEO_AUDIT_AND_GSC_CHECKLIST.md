# KinoLuma SEO-аудит и чеклист

## Что было сделано

1. Доработаны страницы фильмов:
   - уникальный SEO title по типу материала;
   - короткий meta description;
   - JSON-LD Movie/TVSeries;
   - BreadcrumbList JSON-LD;
   - FAQPage JSON-LD;
   - видимый FAQ-блок на странице;
   - fallback для постера, если внешняя картинка сломалась.

2. Доработаны страницы каталога:
   - metadata для категорий;
   - CollectionPage JSON-LD;
   - BreadcrumbList JSON-LD;
   - FAQPage JSON-LD;
   - видимый FAQ-блок;
   - жанры стали отдельными ссылками, а не только локальными кнопками.

3. Добавлены genre pages:
   - /catalog/films/[genre]
   - /catalog/series/[genre]
   - /catalog/anime/[genre]
   - /catalog/cartoons/[genre]
   - /catalog/documentaries/[genre]

4. Улучшен sitemap:
   - главная;
   - категории;
   - жанровые страницы;
   - страницы всех материалов.

5. Улучшен fallback постеров:
   - если основной постер не загрузился, используется posterFallbacks;
   - если запасной картинки нет, генерируется тёмная KinoLuma-заглушка.

## Что проверить после установки

1. Запустить сборку:

```bash
npm run build
```

2. Проверить несколько страниц в браузере:

```txt
/movie/dune-part-two
/movie/stranger-things
/catalog/films
/catalog/series
/catalog/anime
/catalog/films/fantastika
```

3. Проверить structured data:

```txt
https://validator.schema.org/
```

Проверь:

```txt
Movie или TVSeries
BreadcrumbList
FAQPage
CollectionPage для каталога
```

4. Google Search Console:

- добавить домен kinoluma.online;
- подтвердить владение доменом;
- отправить sitemap.xml;
- проверить Coverage / Pages;
- проверить вручную 5-10 URL через URL Inspection;
- запросить индексацию важных страниц;
- через пару дней проверить, нет ли ошибок в rich results / structured data.

## Важно

Редиректы www/http не трогались, потому что они уже сделаны на твоей стороне.
Kinopoisk ID уже остаются в movies.ts и используются в JSON-LD через sameAs/identifier.
