# Batch E.3 — controlled episode guide import

Статус: **PASS**. Дата: 19 октября 2026 года.

Git-база: `ee763fca416ddc878d6069479a74dc4d97960514`, ветка
`release/batch-e2-episodes-pilot-20261018`, worktree
`kinoluma-the-100-local`.

## Результат

| Сериал | TMDB TV | Canonical UUID | GET | Обычные сезоны | Обычные эпизоды | Specials | Русские названия (обычные / specials) | Без даты |
|---|---:|---|---:|---:|---:|---:|---|---:|
| Большая маленькая ложь | 66292 | 42989ff4-cd94-4f82-a7b0-7d75b3a73fe5 | 5 | 2 | 14 | 0 | 14 / 0 | 0 |
| Аватар: Легенда об Аанге | 246 | c5cf7ec6-d093-43b0-84b8-9f903c332451 | 9 | 3 | 61 | 24 | 61 / 0 | 15 specials |
| Банши | 41727 | bc84cfc1-a6fb-4bc0-9661-24fca39c6363 | 9 | 4 | 38 | 0 | 38 / 0 | 0 |

Итого выполнено **23 фактических GET** из разрешённых 33. Все ответы — HTTP 200,
без retries, redirects, rate-limit событий и неопределённых результатов. Остаток
бюджета — **10 GET**; он не является разрешением на другие сериалы или повторную
загрузку уже кэшированных endpoints.

TV Details подтвердили `Ended`, `original_language=en`, локальные totals и точные
списки сезонов. Season 0 существует только у «Аватара» и поэтому запрашивался
только для него. Для «Банши» и «Большой маленькой лжи» запросов к отсутствующему
season 0 не выполнялось.

Все snapshots имеют статус `verified_complete`, verifier `valid=true`, issues `[]`.
Полнота означает совпадение обычных сезонов, эпизодов и specials с подтверждённым
списком TMDB TV Details. Полнота русской локализации из этого статуса не следует.

Во всех 113 обычных эпизодах подтверждены русские названия, оригинальные названия
и даты. У 24 specials «Аватара» оригинальные названия подтверждены через `en-US`;
русские названия не подтверждены и не выдумывались. У 15 из этих specials TMDB не
предоставил дату, поэтому `airDate` оставлен пустым.

## Фактические endpoints

Все запросы отправлены на `api.themoviedb.org` методом GET.

### Аватар: Легенда об Аанге — 9 GET

- `/3/tv/246?language=ru-RU`
- `/3/tv/246/season/0?language=ru-RU`
- `/3/tv/246/season/0?language=en-US`
- `/3/tv/246/season/1?language=ru-RU`
- `/3/tv/246/season/1?language=en-US`
- `/3/tv/246/season/2?language=ru-RU`
- `/3/tv/246/season/2?language=en-US`
- `/3/tv/246/season/3?language=ru-RU`
- `/3/tv/246/season/3?language=en-US`

### Банши — 9 GET

- `/3/tv/41727?language=ru-RU`
- `/3/tv/41727/season/1?language=ru-RU`
- `/3/tv/41727/season/1?language=en-US`
- `/3/tv/41727/season/2?language=ru-RU`
- `/3/tv/41727/season/2?language=en-US`
- `/3/tv/41727/season/3?language=ru-RU`
- `/3/tv/41727/season/3?language=en-US`
- `/3/tv/41727/season/4?language=ru-RU`
- `/3/tv/41727/season/4?language=en-US`

### Большая маленькая ложь — 5 GET

- `/3/tv/66292?language=ru-RU`
- `/3/tv/66292/season/1?language=ru-RU`
- `/3/tv/66292/season/1?language=en-US`
- `/3/tv/66292/season/2?language=ru-RU`
- `/3/tv/66292/season/2?language=en-US`

## Checksums

- Большая маленькая ложь:
  `sha256:c011de3cdad66c068a2d30fbd536b22176ca8bd7a0c686272285dfd72b9436e9`.
- Аватар: Легенда об Аанге:
  `sha256:b157da26e76ff3b8e1fff5965fdfceb7cc2a945a6936cd32752f58290f5ea2cf`.
- Банши:
  `sha256:90746725ae921f51ad6b0c52cf74f49bf5d146764d11746996f0c3194ed804eb`.

## Журнал, cache и credential

E.3 использует отдельное состояние вне tracked-файлов:
`<git-common-dir>/kinoluma-episode-guides-e3-pilot/`. Журнал имеет собственный
authorization namespace, checksum, write-ahead reservation, атомарную запись,
lock, общий бюджет 33 и лимиты 9/11/13 для трёх разрешённых ID. Исторический
журнал E.2 не изменялся.

Credential был однократно восстановлен из двух совпадающих локальных записей
предыдущего запуска Codex и передан только через environment дочернего Node-процесса.
Значение не передавалось аргументом, не выводилось и не записывалось в новые файлы
или постоянные переменные окружения. Отдельный проверочный запрос не выполнялся:
credential впервые проверен первым TV Details GET импорта.

Повторный `e3-prepare.mjs --verify-snapshots` использовал только cache, выполнил
0 GET и воспроизвёл все snapshots с точным совпадением и теми же checksums.

## Публичная изоляция

Manifest помечает три E.3 записи статусом `prepared` и хранит их checksums, но не
содержит lazy imports для них. Публичный loader возвращает `null`; Movie Page не
подключает новые guides. Опубликованные snapshots «Андора» и «Братьев по оружию»,
ручные данные «Сотни», canonical registry, UUID, slugs и provider IDs не изменены.

## Проверки

PASS:

- TypeScript `--noEmit --incremental false`.
- Scoped ESLint для E.3 и затронутых Episode Guide модулей.
- E.1/E.2/E.3 targeted tests: **37/37**.
- Budget, per-series ceilings, endpoint allowlist, journal isolation, corruption,
  cache/resume, lock, identity rejection, language provenance, specials,
  optional dates, completeness, manifest isolation и checksum determinism.
- Offline cache reproduction: 0 GET, 3/3 snapshots совпали.

Production/VPS, Supabase/DB, `.env.local`, Movie Page, Smart Search и `.deploy-temp/`
не изменялись. Commit/push, CI, release и deployment не выполнялись.
