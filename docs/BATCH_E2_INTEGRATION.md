# Batch E.2 — Local Movie Page Integration

Статус: **PASS**. Серверная интеграция, локальные тесты и изолированная offline Visual QA завершены.

## Рабочее состояние и границы

- Worktree: `kinoluma-the-100-local`.
- HEAD: `64620a72d332438b64f9562921c9950efa0e1c24`.
- Существующая ветка: `release/movie-page-smooth-animations-20261017`; новая ветка не создавалась.
- Предыдущие незакоммиченные E.1/E.2 сохранены; `.deploy-temp/` не затрагивалась.
- Snapshots, canonical identities, Smart Search и данные остальных восьми сериалов не изменены.
- Новых реальных HTTP/API-запросов не выполнялось: TMDB, PoiskKino, Supabase/DB не вызывались.
- VPS/production не затрагивались; env-файлы не создавались и не менялись.
- Нет commit/push, deployment, GitHub Actions или полного Linux CI.

## Изменённые/добавленные файлы этого этапа

- `src/app/lib/episodeGuides/movieIntegration.ts` — server-only адаптер verified snapshot к Movie.
- `src/app/lib/movies/movieOverrides.ts` — вызов адаптера перед существующим applyOverride.
- `src/app/data/movies.ts` — optional originalTitle/airDate у эпизода, отдельное поле episodeSpecials; без изменений каталога.
- `src/app/movie/[slug]/MoviePageClient.tsx` — lazy mounting существующего accordion, optional даты/названия, отдельная секция specials.
- `scripts/episode-guides/integration.test.mjs` — canonical binding, checksum, изоляция каталога, merge fixtures и отсутствие сети.
- `scripts/episode-guides/accordion.test.mjs` — SSR настоящего компонента и детерминированные hook/scheduler fixtures.
- `package.json` — добавлена команда `test:episode-guides:integration`, прежние E.1/E.2 команды сохранены.
- `docs/BATCH_E2_INTEGRATION.md` — этот отчёт.

## Серверный путь и manual overrides

Порядок применения данных сохранён:

1. Существующая canonical metadata публичной базовой карточки.
2. `attachVerifiedEpisodeGuide` → существующий `loadEpisodeGuideSnapshot`.
3. Неизменённый `applyOverride` со всей прежней логикой ручных полей.
4. Существующий `attachVerifiedCredits` и финальная sanitization.

Загрузка идёт только по canonicalMovieId. Slug и TMDB ID не используются как fallback-ключи.
Loader проверяет canonical identity, TV namespace, provider ID, provenance и checksum;
адаптер дополнительно отвергает несовпадающие slug/provider ID и явно конфликтующий namespace карточки.
При отсутствии namespace в карточке используется проверенный TV namespace canonical registry.
Manifest сохраняет lazy import каждого отдельного snapshot: available только два, planned восемь.
Клиентский каталог не импортирует snapshots и не получает episodeGuide массово.
Новых зависимостей от DB нет. Возвращаются новые массивы, не изменяющие cached snapshot.

Fixtures выполняют настоящий getMovieWithOverrides с локальной заглушкой DB-модуля,
а не упрощённую копию merge. Проверены ручной guide, его явная очистка, specials,
счётчики, runtime/rating, защита canonical ID/slug/id, hidden и более позднее credits enrichment.
Фактические production/runtime overrides из DB не читались и не подтверждены.

## Эпизоды и UI

| Карточка | Обычные сезоны/эпизоды | Specials |
| --- | --- | --- |
| Братья по оружию | 1 / 10 | 6 |
| Андор | 2 / 24 | 5 |

Specials отображаются отдельной секцией на том же accordion и стилях, с собственными номерами и датами.
Они не включены в сумму обычных эпизодов/сезонов. Поля seasons/episodes каталога не пересчитываются.
Русские названия snapshot проходят существующую provenance-проверку; отсутствующие переводы не создаются.
Fallback: русский → оригинальный → нейтральная подпись «Серия N».
Оригинальное название вторым рядом выводится только когда есть и отличается от русского.
Без airDate элемент time не создаётся, фиктивная дата не подставляется.

Закрытый сезон не монтирует ol/li. При открытии список монтируется в закрытой оболочке,
после двух animation frames запускается прежний CSS transition.
При закрытии DOM сохраняется до собственного grid-template-rows transitionend;
резервный таймер 350 ms предотвращает зависание при потере события.
Быстрые переключения отменяют прежние frames/timers, cleanup отменяет их при unmount.
Reduced motion открывает/закрывает список сразу, без запланированной анимации.
Сохранены button, aria-expanded, aria-controls, aria-hidden, focus-visible и прежние responsive/motion стили.
«Сотня» сохраняет исходные данные: 7 сезонов, 100 эпизодов; применяется только общая адаптация accordion.

## Выполненные проверки

- `node --test scripts/episode-guides/e1.test.mjs scripts/episode-guides/e2.test.mjs scripts/episode-guides/integration.test.mjs scripts/episode-guides/accordion.test.mjs scripts/the-100.test.mjs scripts/episode-accordion-cast.test.mjs` — **40/40 PASS**.
- Из них E.1/E.2 — 25, integration — 7, accordion SSR/scheduler — 6, существующие regression scripts — 2.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — **PASS**.
- Targeted ESLint новых production/test файлов — **PASS**, без замечаний.
- Targeted ESLint всех изменённых TS/TSX — **не полностью зелёный**: 2 прежние ошибки react-hooks/set-state-in-effect в player/poster эффектах MoviePageClient и 4 прежних предупреждения. Сравнение lintText исходников из HEAD с рабочими файлами подтвердило идентичные диагностики; новых ошибок/предупреждений нет. Несвязанные эффекты не менялись.
- `node scripts/episode-guides/e1-dry-run.mjs --json` — **PASS**: 10 identities/manifest entries, 2 verified snapshots, 0 созданных guides в каталоге, 0 network requests.
- `git diff --check` — **PASS**; новые файлы дополнительно проверены через diff --no-index --check, без whitespace errors.
- Checksums сверены существующим verifier и закреплены точными assertions в integration tests:
  - Братья по оружию: `sha256:a7269e8832e1603c97415355542d7cf9bf7fd346eeb92b21367ba424c5bc8c5a`.
  - Андор: `sha256:39bfdaf2a4fb4331dad448abe2925941e75a424285539dc3f053e21e97ff2ce8`.

## Desktop/mobile Visual QA — PASS

QA выполнена во временном Next-harness вне production source tree. Harness импортировал реальный
`MoviePageClient`, production `globals.css`, существующий server-only merge и локальные snapshots.
Supabase-клиент, постеры, трейлеры и плееры были заменены только внутри harness локальными no-session/placeholders.
Исходная конфигурация Supabase и `.env.local` не менялись. После проверки browser tab, viewport overrides
и серверы закрыты; весь каталог `.qa-tmp` вместе с generated build output удалён.

- Desktop `1280×720`: «Андор» — 2 сезона/24 серии + 5 specials; «Братья по оружию» — 1 сезон/10 серий + 6 specials. Горизонтальный overflow и выход карточек за viewport: 0.
- Mobile `390×844`: те же количества, номера и секции; `scrollWidth === clientWidth`, обрезанных section/accordion/episode cards: 0.
- Проверены русские названия всех 24 обычных серий «Андора» и 10 серий «Братьев по оружию». Оригинал показывается вторым рядом только при подтверждённом русском названии. Specials без русского названия используют originalTitle без придуманного перевода.
- Все даты двух реальных snapshots отображаются из `airDate`; фиктивных `TBD`, тире или «Уточняется» в эпизодах нет. Отсутствующая дата отдельно проверена fixture-тестом: элемент `time` не создаётся.
- Normal motion: `300ms` panel и `220/300ms` inner transitions; на промежуточном кадре открытия высота была `608.84px`, opacity `0.54`, на закрытии — `220.17px`, opacity `0.46`. Список оставался mounted до завершения exit-анимации.
- Reduced motion: браузерный media query был активен нативно; duration panel/inner — `0s`, открытие и закрытие оставляли содержимое доступным и немедленно монтировали/удаляли список.
- Быстрый цикл close/open/close/open завершился согласованно: `aria-expanded=true`, `aria-hidden=false`, 12 элементов; stale timers/frames не удалили открытый список.
- Keyboard: Space и Enter переключают accordion; `aria-expanded`, `aria-controls` и target IDs согласованы. Закрытые списки отсутствуют в DOM, focusable-элементов в скрытых panels — 0.
- Чистые повторные прогоны: console warnings/errors — 0, Next error overlay — отсутствует, hydration/runtime errors — 0.
- «Сотня»: 7 сезонов/100 серий, закрытые сезоны lazy-mounted, сезон 7 раскрывает 16 серий и после закрытия удаляет их DOM. Актёрская панель «Показать ещё 2»/«Скрыть» сохраняет aria-состояния и анимацию.

Во время QA исправлено русское склонение счётчиков: `1 сезон`, `2 сезона`, `24 серии`.
Первый вариант временного motion-harness добавлял диагностический HTML-атрибут до hydration; это вызвало mismatch
только в harness. Атрибут удалён, tab пересоздан, и все результаты выше получены повторным чистым прогоном.

Сетевой preload и CSP блокировали все non-loopback обращения до отправки. Next dev пытался вызвать только
свою проверку npm registry, а основной App preview — poster lookup; guard зарегистрировал и заблокировал их.
TMDB/PoiskKino/Supabase/DB/VPS/production запросов не выполнено. Финальный isolated harness делал только loopback-запросы.

## Готовность и следующий шаг

Batch E.2 готов к отдельной подготовке release. Release, commit, push и deployment не выполнялись.
Перед release остаётся отдельное решение по двум прежним `react-hooks/set-state-in-effect` замечаниям
MoviePageClient. Production runtime overrides из DB не читались; их фактическое состояние остаётся
непроверенным, а порядок merge подтверждён локальными fixtures без DB.
