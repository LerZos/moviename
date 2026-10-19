# Batch E.2 — controlled TMDB pilot

Статус: **PASS**. Дата: 18 октября 2026.

База: `64620a72d332438b64f9562921c9950efa0e1c24`,
tree `8fd127b7fdbc44ee3ffbd8bdd116357f99cddc92`,
существующая ветка `release/movie-page-smooth-animations-20261017`,
worktree `kinoluma-the-100-local`. Незакоммиченные изменения E.1 сохранены.

## Результат

| Сериал | TMDB TV | Canonical UUID | GET | Загруженные сезоны | Обычные эпизоды | Specials | Русские названия (обычные / specials) | Нет даты |
|---|---:|---|---:|---|---:|---:|---|---:|
| Братья по оружию | 4613 | 01c49b47-8e78-48c7-a718-ec2c06824aa1 | 5 | 0, 1 | 10 | 6 | 10 / 3 | 0 |
| Андор | 83867 | 174f15d5-abe2-433e-9e8e-e65c61391ca2 | 7 | 0, 1, 2 | 24 | 5 | 24 / 0 | 0 |

Итого: **12 реальных HTTPS GET**, все HTTP 200, без retries или redirects.
До сети вычислен консервативный план: 2 details + 5 seasons × 2 languages = 12.
Первый процесс получил два details; второй возобновился с сохранённым счётчиком 2 и выполнил 10 оставшихся GET.
После получения списка сезонов фактический полный план также составил 12.
Дополнительных запросов для завершения этого pilot не требуется; доступный остаток — 0.

Оба snapshot — `verified_complete`, verifier valid=true, issues=[].
Complete означает полноту списка обычных эпизодов и specials относительно полученного списка сезонов TMDB; наличие всех русских переводов не подразумевается.
`sourceLanguage=en` подтверждён TV Details; оригинальные названия получены отдельно через `en-US`.
Русские названия взяты только из `ru-RU`; английский fallback и служебные подписи «Эпизод N» исключены.
Пропуски русского названия: «Братья по оружию» S00E02, E04, E06; «Андор» S00E01–E05.
Все 45 эпизодов имеют оригинальное название и дату. Season 0 хранится исключительно в `specials`.

## Фактические endpoints

Host: `api.themoviedb.org`. Метод: GET. Время наблюдения указано в UTC.

| Endpoint | HTTP | observedAt |
|---|---:|---|
| `/3/tv/4613?language=ru-RU` | 200 | 2026-10-18T10:13:17.468Z |
| `/3/tv/83867?language=ru-RU` | 200 | 2026-10-18T10:13:17.646Z |
| `/3/tv/4613/season/0?language=ru-RU` | 200 | 2026-10-18T10:13:32.879Z |
| `/3/tv/4613/season/0?language=en-US` | 200 | 2026-10-18T10:13:33.042Z |
| `/3/tv/4613/season/1?language=ru-RU` | 200 | 2026-10-18T10:13:33.301Z |
| `/3/tv/4613/season/1?language=en-US` | 200 | 2026-10-18T10:13:33.619Z |
| `/3/tv/83867/season/0?language=ru-RU` | 200 | 2026-10-18T10:13:33.793Z |
| `/3/tv/83867/season/0?language=en-US` | 200 | 2026-10-18T10:13:33.971Z |
| `/3/tv/83867/season/1?language=ru-RU` | 200 | 2026-10-18T10:13:34.243Z |
| `/3/tv/83867/season/1?language=en-US` | 200 | 2026-10-18T10:13:34.515Z |
| `/3/tv/83867/season/2?language=ru-RU` | 200 | 2026-10-18T10:13:34.901Z |
| `/3/tv/83867/season/2?language=en-US` | 200 | 2026-10-18T10:13:35.117Z |

## Проверка данных и конфликты

- UUID, slug и TMDB TV ID сверены с canonical registry и единственной соответствующей статической карточкой.
- ID сезона сверены с TV Details; show_id, season_number, episode_number и episode ID сверены в обоих языковых ответах.
- Проверены дубли, непрерывность обычной нумерации, количества по каждому сезону, totals без season 0, формат и реальность дат.
- Конфликты с проверенными локальными данными: **нет** (количество обычных сезонов, эпизодов, статус и первая дата выхода).
- Расхождения русской/английской identity и дат: **нет**.
- Каталог, canonical registry, provider IDs и ручные corrections не изменены.
- Runtime Supabase overrides не читались; их сопоставление этим pilot не подтверждается.

## Checksums

Братья по оружию:

`sha256:a7269e8832e1603c97415355542d7cf9bf7fd346eeb92b21367ba424c5bc8c5a`

Андор:

`sha256:39bfdaf2a4fb4331dad448abe2925941e75a424285539dc3f053e21e97ff2ce8`

## Файлы E.2

Новые:

- `scripts/episode-guides/register-local.mjs` — CLI/test TypeScript bridge.
- `scripts/episode-guides/e2Transport.ts` — единственный транспорт, постоянный счётчик, lock, cache/resume, allowlist.
- `scripts/episode-guides/e2Import.ts` — локальные identity checks и планирование запросов.
- `scripts/episode-guides/e2Normalize.ts` — нормализация реальных ответов, локализация и отдельные конфликты.
- `scripts/episode-guides/e2-run.mjs` — по умолчанию offline CLI с фиксированным местом журнала.
- `scripts/episode-guides/e2-prepare.mjs` — подготовка и воспроизведение snapshots только из кэша.
- `scripts/episode-guides/e2.test.mjs` — транспортные, импортные и snapshot tests.
- `src/app/lib/episodeGuides/snapshots/01c49b47-8e78-48c7-a718-ec2c06824aa1.ts`.
- `src/app/lib/episodeGuides/snapshots/174f15d5-abe2-433e-9e8e-e65c61391ca2.ts`.
- `docs/BATCH_E2_PILOT.md` — этот отчёт.

Изменены поверх E.1:

- `src/app/lib/episodeGuides/types.ts` — ожидаемое количество specials.
- `src/app/lib/episodeGuides/normalizer.ts` — сохранение этого количества, стабильная сортировка provenance при равных timestamps.
- `src/app/lib/episodeGuides/verifier.ts` — полнота specials, проверка expected counts и согласованности статуса complete.
- `src/app/lib/episodeGuides/manifest.ts` — два явных lazy imports; остальные восемь остаются planned.
- `scripts/episode-guides/e1-dry-run.mjs` — проверяет доступные внутренние snapshots, сохраняя проверку отсутствия guides в публичном каталоге.
- `package.json` — команды E.2; зависимости не добавлялись.

## Журнал и безопасное возобновление

Runtime-state хранится вне tracked source:
`<git-common-dir>/kinoluma-episode-guides-e2-pilot/`.

- `journal.json`: checksum-защищённый журнал с response payloads, endpoint, HTTP status и observedAt.
- `prepared-snapshots.json`: воспроизводимый локальный результат нормализации и диагностики.
- `session.lock`: эксклюзивный lock на время процесса; при штатном завершении удаляется.

До каждого реального вызова HTTPS выполняются allowlist/budget checks и атомарная запись reserved entry с fsync.
Native HTTPS transport делает ровно один GET, без автоматических retries и redirects; concurrency=1.
Перезапуск читает общий журнал, cache-hit не вызывает сеть. Повторная инициализация существующего каталога запрещена.
Повреждение, потеря журнала или неопределённая reserved entry блокируют дальнейшую сеть.
429 сохраняет Retry-After и останавливает импорт; 401/403/5xx, network error и quota exhaustion также останавливают.
Секреты не сохраняются в журнал, snapshots, исходники или env-файлы.

Журнал нельзя удалять или заменять для повторного импорта: израсходованы все 12 разрешённых GET.
Новый сетевой импорт требует отдельного разрешения и явно установленного нового бюджета.

## Локальная проверка

PASS:

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Targeted ESLint для новых/изменённых модулей.
- `node --test scripts/episode-guides/e1.test.mjs scripts/episode-guides/e2.test.mjs`: **25/25**, E.1 12/12 + E.2 13/13.
- В тестах реальная сеть заблокирована; используются изолированные synthetic fixtures.
- `node scripts/episode-guides/e2-prepare.mjs --verify-snapshots`: точное deep equality обоих snapshot с нормализацией cache, checksum совпадают, 0 новых запросов.
- Manifest integrity: 2 available + 8 planned, весь loader path проходит verifier.
- Реальное возобновление: счётчик 2 → 12 между двумя процессами.
- `git diff --check`.

## Границы результата

Snapshots ещё не подключены к Movie Page. Полный build/CI и desktop/mobile QA не запускались.
Production, VPS, Supabase/DB, .env.local, «Сотня», Smart Search и .deploy-temp/ не изменялись.
Commit/push, новая ветка и deployment не выполнялись.
Credentials использованы только в памяти процесса. Остальные восемь сериалов не импортировались.
Дальнейшая интеграция или расширение импорта — только отдельным разрешённым этапом.

