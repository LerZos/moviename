# KinoLuma manual curated pack v11

Цель патча: исправить v10, где большая часть ручного пака совпала с уже существующими slug и почти не увеличила публичный каталог.

## Проверка количества

- Базовая проверочная сборка до ручного v10: 1375 публичных карточек.
- v10 после фильтра дублей: 1380 публичных карточек, потому что из 130 объектов реально новыми оказались только 5.
- v11 после замены ручного пака: 1405 публичных карточек.
- Прирост v11 относительно базовой проверки: +30 видимых карточек.
- Ручной пакет v11: 30 объектов.
- Видимых объектов из `kinoluma-manual-curated-expansion-v11`: 30.
- Пересечений slug с базовым каталогом: 0.

Если локально до патча у проекта показывалось 1368, после v11 счётчик должен увеличиться примерно на 30 относительно твоего текущего состояния. Точная цифра может отличаться, если в локальной копии уже были свои добавления или удаления.

## Что добавлено

### Фильмы — 17

- Годзилла: Минус один / Godzilla Minus One — KP 5354707, TMDb 940721
- Чужой: Ромул / Alien: Romulus — KP 4887347, TMDb 945961
- Гран Туризмо / Gran Turismo — KP 1044002, TMDb 980489
- Байкеры / The Bikeriders — KP 5069437, TMDb 1008409
- Общество снега / Society of the Snow — KP 4745702, TMDb 906126
- Стальная хватка / The Iron Claw — KP 5005446, TMDb 850165
- Ренфилд / Renfield — KP 4703238, TMDb 649609
- Бессмертный / Sisu — KP 4652406, TMDb 840326
- Кит / The Whale — KP 4321512, TMDb 785084
- Варяг / The Northman — KP 1313198, TMDb 639933
- Быстрее пули / Bullet Train — KP 1392550, TMDb 718930
- М3ГАН / M3GAN — KP 4422814, TMDb 536554
- Солнце моё / Aftersun — KP 4948281, TMDb 965150
- Меню / The Menu — KP 1257264, TMDb 593643
- Город астероидов / Asteroid City — KP 4395987, TMDb 747188
- Одержимость / Whiplash — KP 725190, TMDb 244786
- Богемская рапсодия / Bohemian Rhapsody — KP 568289, TMDb 424694

### Сериалы — 7

- Укрытие / Silo — KP 4541515, TMDb 125988
- Поколение «Ви» / Gen V — KP 1431133, TMDb 205715
- Медленные лошади / Slow Horses — KP 1331649, TMDb 95480
- Король Талсы / Tulsa King — KP 4760854, TMDb 153312
- Ночной агент / The Night Agent — KP 4542045, TMDb 129552
- Ричер / Reacher — KP 1209839, TMDb 108978
- Мэр Кингстауна / Mayor of Kingstown — KP 4420223, TMDb 97951

### Мультфильмы — 6

- Элементарно / Elemental — KP 4889667, TMDb 976573
- Нимона / Nimona — KP 4948091, TMDb 961323
- Орион и Тьма / Orion and the Dark — KP 5326241, TMDb 1139829
- Тайна Коко / Coco — KP 679486, TMDb 354912
- Моана / Moana — KP 837530, TMDb 277834
- Душа / Soul — KP 775273, TMDb 508442

## Страницы и SEO

Каждая карточка содержит:

- уникальный `description`;
- уникальный `longDescription`;
- `kinopoiskId`;
- `tmdbId`;
- `imdbId`;
- `facts`;
- `cast`;
- `players` для Collapse и Factorios по Kinopoisk ID;
- постер через `getGeneratedTmdbPoster`;
- пустой `trailerUrl`, чтобы существующий автопоиск трейлера искал его по TMDb/KP/названию.

## Sitemap и robots

`sitemap.ts` уже строит страницы из публичного каталога через `getCachedPublicMovies()`, поэтому новые `/movie/...` URL попадают в sitemap автоматически.

`robots.ts` менять не пришлось: он уже разрешает публичные страницы и указывает sitemap.

## Изменённые файлы

- `data/manualCuratedExpansionPack.ts`
- `data/movieCardIndex.ts`
- `data/movieSlugs.ts`
- `data/profileCatalogItems.ts`
- `MANUAL_CURATED_PACK_V11.md`
