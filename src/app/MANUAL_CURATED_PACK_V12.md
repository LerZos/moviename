# KinoLuma Manual Curated Pack v12

v12 исправляет главную проблему проверки: если счётчик на главной остаётся 1368, значит файлы из ZIP не попали в активную папку `src/app` или сайт запущен из старой production-сборки.

В этом ZIP файлы лежат в двух вариантах:

- обычная структура `data/...`, `HomeClient.tsx`, `page.tsx` — для распаковки прямо в `src/app`;
- дублирующая структура `src/app/...` — для распаковки в корень проекта.

Добавлен проверочный роут:

```txt
/api/debug/catalog-count
```

После `npm run build` и `npm run start` открой:

```txt
http://localhost:3000/api/debug/catalog-count
```

Нормальный результат для этого пака:

```json
{
  "catalogTotal": 1405,
  "manualPackTotal": 30,
  "visibleManualPackTotal": 30
}
```

Если там снова 1368 или роут не найден — ZIP распакован не туда или сервер не был пересобран/перезапущен.
