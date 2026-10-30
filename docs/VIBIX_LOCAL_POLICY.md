# Vibix: локальная политика привязок

Основание: авторизованный аудит кабинета 2026-10-23 и согласованная локальная задача 2026-10-24.
Это не разрешение на deployment. Реальное воспроизведение на localhost не подтверждено.

## Выбор на Movie Page

Server-only prepareVibixPlan сверяет canonical UUID, slug, тип и доступные provider IDs
с существующим registry, не ищет по названию и не делает сетевых запросов.
В клиент передаётся небольшой план, а не полный registry.

1. Проверенный ручной mapping (vibixProvenance.source = manual-verified) или точное
   совпадение с локальным verifiedVibixMappings.json.
2. Официальный SDK по подтверждённому KP; при его отсутствии — IMDb с tt.
3. Без подтверждённой identity — без автогенерации. При конфликте Vibix отключён.

Поле vibixProvenance связывает source, canonicalMovieId, slug, contentType и
stablePlayerKey (publisher + namespace + ID либо iframe URL). Оно не является
криптографической подписью: ввод доверен только через существующий защищённый admin
путь. Прежние authorization guards не изменены.

Отсутствие provenance НЕ означает, что запись ручная или автоматическая.
Неоднозначные сохранённые варианты и их порядок сохранены с предупреждением;
массовая миграция не выполнялась. Явно обозначенный legacy-generated mapping
может уступить проверенному внешнему ID. Такой marker не присваивается старым
записям по числу или названию.

Существующий серверный lookup сохранён. Подготовленный план Movie Page его не
запускает: credentials не нужны для прямой SDK-вставки. Ошибка SDK не вызывает
каскад API-запросов или подмену произведения.

## Админка

Редактор использует adminPlayers → общий players parser.
Поддерживаются movie/series/kp/imdb и разрешённые HTTPS Vibix iframe.
Round-trip сохраняет существующие стили, provenance и альтернативные источники.
Неверная новая строка отменяет сохранение, а не исчезает молча.
Отдельный checkbox подтверждает все указанные Vibix mappings для текущего
произведения; обычное сохранение не повышает их уровень доверия.
Кнопка генерации дополняет существующие варианты, а не удаляет их.

## Исправление Spider-Man

В generatedKinopoiskRequested изменены только id/contentId одной записи:
movie:4904 → movie:325785. Canonical UUID, slug и KP/IMDb/TMDB не менялись.
verifiedVibixMappings.json хранит подтверждение и полную привязку identity.
Генератор использует это исключение до API lookup; при конфликте KP/IMDb/TMDB,
года или типа останавливается. Сам генератор в этой задаче не запускался.

## Ограничения

Наличие ID, записи каталога или iframe не доказывает воспроизведение.
Ограничение localhost остаётся отдельным внешним вопросом.
Парсеры import-dashboard/update-draft не мигрировались: новые форматы поддержаны
в редакторе существующей карточки. Не использовать старый импортный редактор для
round-trip новых provenance/KP/IMDb mappings без отдельной доработки.
Перед отдельным релизом нужны review и согласованная проверка в разрешённом
провайдером контексте. Изменения не относятся к артефакту Batch E.3.

## Проверки 2026-10-24

- Vibix: 24 существующих + 19 новых тестов; минимальные регрессии: 20. Всего 63/63.
- TypeScript --noEmit --incremental false: PASS.
- Scoped ESLint: 0 ошибок; 3 предупреждения в существующих местах (img и TARGET_TOTALS).
- git diff --check: PASS.
- Изолированный Next harness вне repository: реальные MoviePageClient,
  VibixPlayer и MovieAdminEditForm; замена только session adapter и необязательных
  ресурсов. CSP запрещает внешние SDK/iframe/media, серверный egress guard
  запрещает внешние соединения. Никаких credentials.
- Desktop: фактический CSS viewport 1280×720. Mobile: 390×844.
  Overflow отсутствует, контейнер 16:9, переключение SPA и lazy mounting сохранены.
  DOM содержит movie:325785 / kp:696973 / imdb:tt1910272 в соответствующих fixtures.
- Проверены legacy-warning, отсутствие identity, checkbox подтверждения и
  неверный ввод редактора без отправки формы. Runtime/hydration errors не выявлены.
  В harness были предупреждения про placeholder image и smooth-scroll атрибут.
- Реальное SDK-воспроизведение, fullscreen видео и provider UI не проверялись.
  Блокировка SDK дала ожидаемое состояние задержки, а не ложный playback PASS.
- Стенд на порту 3268 остановлен, listener отсутствует; тестовая вкладка закрыта.
  Harness сохранён только в локальном Temp вне repository для воспроизведения QA.

## Файлы текущего изменения

Изменены:

- src/app/data/generatedKinopoiskRequested.ts
- scripts/generate-kinopoisk-requested-pack.mjs
- src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx
- src/app/lib/players.ts
- src/app/lib/vibix.ts (существовавший незакоммиченный файл)
- src/app/movie/[slug]/MoviePageClient.tsx
- src/app/movie/[slug]/page.tsx

Добавлены:

- src/app/data/verifiedVibixMappings.json
- src/app/lib/vibixPolicy.ts
- src/app/lib/adminPlayers.ts
- scripts/lib/verified-vibix-mapping.mjs
- scripts/vibix-policy.test.mjs
- docs/VIBIX_LOCAL_POLICY.md

Прежние route.ts, VibixPlayer.tsx, useVibixLookup.ts, vibixLookup.ts и
scripts/vibix.test.mjs сохранены байт-в-байт. Итоговый Git status относительно HEAD:
7 modified tracked, 11 новых файлов и прежний .deploy-temp/.
Ветка release/batch-e3-episodes-20261020 и HEAD 76549fa не менялись.
