# Batch E.3 — Local UI Integration + Visual QA

Дата: 2026-10-20. **Интеграция и Visual QA: PASS. Общий статус: PARTIAL** — автоматическое удаление временного harness заблокировано политикой среды.

## Git-база

Worktree: kinoluma-the-100-local. HEAD: `ee763fca416ddc878d6069479a74dc4d97960514`.
Ветка: `release/batch-e2-episodes-pilot-20261018`. Новая ветка не создавалась.
Предыдущие локальные изменения импорта E.3 сохранены. Повторного импорта нет.

## Активированные записи

| Сериал | Canonical UUID | TMDB TV | Сезоны / серии | Specials |
| --- | --- | --- | --- | --- |
| Большая маленькая ложь | 42989ff4-cd94-4f82-a7b0-7d75b3a73fe5 | 66292 | 2 / 14 | 0 |
| Аватар: Легенда об Аанге | c5cf7ec6-d093-43b0-84b8-9f903c332451 | 246 | 3 / 61 | 24 |
| Банши | bc84cfc1-a6fb-4bc0-9661-24fca39c6363 | 41727 | 4 / 38 | 0 |

Только эти три записи переведены prepared → available с индивидуальными lazy imports.
Manifest: пять available, пять planned. Slug Аватара avatar-legenda-ob-aange-2004 сохранён.
Существующий server-only loader проверяет canonical identity, TV namespace и provider ID
до импорта, затем verifier/provenance/checksum. Тесты подтверждают загрузку только запрошенного snapshot.
В клиентских JS-чанках временного Next-preview отсутствуют snapshot-модули и их checksums.
Новых runtime-зависимостей от TMDB нет.

Checksums подтверждены verifier и закреплены assertions:

- Большая маленькая ложь: `sha256:c011de3cdad66c068a2d30fbd536b22176ca8bd7a0c686272285dfd72b9436e9`.
- Аватар: `sha256:b157da26e76ff3b8e1fff5965fdfceb7cc2a945a6936cd32752f58290f5ea2cf`.
- Банши: `sha256:90746725ae921f51ad6b0c52cf74f49bf5d146764d11746996f0c3194ed804eb`.

Snapshots не редактировались.

## Merge, названия и даты

Pipeline E.2 не изменён:
canonical metadata → verified snapshot → manual overrides → verified credits / sanitization.

Offline fixtures выполняют настоящий getMovieWithOverrides с заглушкой DB-модуля.
Проверены ручной guide, specials с ручными названием/датой, явная очистка массивов,
hidden, сохранение canonical/provider IDs и позднее credits enrichment.
Конфликты namespace/provider/slug блокируются для всех пяти available guides.
Реальные production overrides из DB не читались и не подтверждены.

У всех 113 обычных эпизодов E.3 отображаются русские названия и подтверждённые даты.
У Аватара 24 specials отдельно: 24 оригинальных названия, 0 русских переводов,
9 дат; у остальных 15 отсутствует time. Specials не увеличивают основные счётчики.
Пустой секции specials у двух других сериалов нет.
Fallback русский → оригинальный → «Серия N» сохранён; нейтральный fallback проверен fixture-тестом.

## Целевые проверки

- TypeScript: tsc --noEmit --incremental false — PASS.
- Integration + accordion + The 100 + accordion/cast regression scripts — **19/19 PASS**.
- Только затронутые manifest/checksum тесты E.2/E.3 через test-name-pattern — **2/2 PASS**.
- Исторический импортный набор целиком повторно не запускался.
- Scoped ESLint manifest/loader и затронутых тестов — PASS.
- MoviePageClient: **2 прежние ошибки** react-hooks/set-state-in-effect и **1 прежнее предупреждение** no-img-element.
  lintText HEAD и рабочей версии дали полностью идентичные ruleId/severity/line/column/message.
  Новых диагностик нет; несвязанные player/poster эффекты не изменялись.
- git diff --check — PASS. Новые E.3 файлы отдельно проверены на whitespace errors.

## Offline Visual QA

Временный Next-harness вне репозитория импортировал настоящий MoviePageClient,
globals.css, getMovieWithOverrides и server-only loader.
Только в harness DB/session/player-модули заменены заглушками, изображения — локальным SVG.
Env-файлы не создавались и не менялись. Сервер привязан к 127.0.0.1.
Node network guard, CSP и browser routing запрещали внешние обращения.

Выполнены **18 browser-прогонов**:
шесть guides × desktop/mobile normal motion и три E.3 × desktop/mobile reduced motion.
Изолированный headless Chromium использовал явные no-preference/reduce.
Настройки Windows и пользовательские браузерные профили не менялись.

- Desktop **1280×720**, mobile **390×844** — PASS.
- Номера, названия, оригинальные вторые строки и даты всех раскрытых сезонов сверены с локальными данными.
- Horizontal overflow — 0; выход episode cards за границы раскрытых panels — 0.
- Визуально осмотрены E.3, specials Аватара и три регрессионных guides на обоих размерах.
- Закрытые сезоны/specials не содержат ol/li; первая открытая секция отрендерена.
- Enter/Space, Tab между triggers, aria-controls/expanded/hidden и видимый focus работают.
- В закрытых panels нет фокусируемых элементов.
- Быстрый close/open/close/open сохраняет согласованные aria и DOM.
- В чистых прогонах после исправлений console warnings/errors и hydration/runtime errors — 0.

### Motion

Получены **11 реальных измерений** открытия/закрытия:
три E.3 на обоих размерах, specials Аватара на обоих размерах и три регрессионных desktop-панели.
Высота менялась монотонно; промежуточная opacity строго между 0 и 1.
Panel transition — 300 ms, inner — 220/300 ms.

| Mobile-панель | Открытие height / opacity | Закрытие height / opacity | Полная высота |
| --- | --- | --- | --- |
| Ложь, сезон 2 | 406.77 px / 0.328 | 377.16 px / 0.784 | 709.16 px |
| Аватар, сезон 2 | 1150.38 px / 0.329 | 1067.50 px / 0.785 | 2003.88 px |
| Банши, сезон 2 | 589.88 px / 0.329 | 546.89 px / 0.785 | 1027.53 px |
| Аватар, specials | 908.63 px / 0.330 | 842.52 px / 0.785 | 1581.28 px |

Во время закрытия li остаются mounted, после завершения удаляются.
Reduced motion: media query подтверждён, panel/inner duration = 0s,
контент открывается/закрывается и остаётся доступным.

### Регрессии

- Сотня: 7 сезонов / 100 серий; анимация, lazy mounting — PASS.
  Verified credits проверены локальным regression script.
  «Показать ещё»/«Скрыть» проверены Enter/Space на desktop/mobile.
- Андор: 2 / 24 + 5 specials — PASS.
- Братья по оружию: 1 / 10 + 6 specials — PASS.
- Их snapshots, данные и credits не изменены.

## Найденные дефекты

1. У Аватара существующая sanitization даёт двум fact labels одинаковую подпись
   «каталожный номер». key=label вызывал React duplicate-key warning.
   Ключ fact-card теперь включает label и индекс. Значения, порядок, CSS и дизайн неизменны.
   Accordion не переписывался.
2. В первом запуске harness отсутствовала локальная иконка (локальный 500).
   Временный rewrite направил её на placeholder; чистые прогоны повторены.
3. Сравнение browser/Node fixtures адаптировано к различным JS realms без изменения данных.

## Полный список оставшихся изменений относительно HEAD

Изменено/добавлено в UI-этапе:

- src/app/lib/episodeGuides/manifest.ts
- src/app/movie/[slug]/MoviePageClient.tsx
- scripts/episode-guides/integration.test.mjs
- scripts/episode-guides/e2.test.mjs
- scripts/episode-guides/e3.test.mjs
- docs/BATCH_E3_INTEGRATION.md

Сохранены также предыдущие изменения импорта E.3:

- package.json
- scripts/episode-guides/e2Normalize.ts
- src/app/lib/episodeGuides/loader.ts
- docs/BATCH_E3_PILOT.md
- scripts/episode-guides/e3-prepare.mjs
- scripts/episode-guides/e3-run.mjs
- scripts/episode-guides/e3Import.ts
- scripts/episode-guides/e3Normalize.ts
- scripts/episode-guides/e3Transport.ts
- src/app/lib/episodeGuides/snapshots/42989ff4-cd94-4f82-a7b0-7d75b3a73fe5.ts
- src/app/lib/episodeGuides/snapshots/c5cf7ec6-d093-43b0-84b8-9f903c332451.ts
- src/app/lib/episodeGuides/snapshots/bc84cfc1-a6fb-4bc0-9661-24fca39c6363.ts

Существующий untracked .deploy-temp/ не просматривался, не менялся и не удалялся.
BATCH_E3_PILOT описывает состояние prepared до этого отдельного UI-этапа.

## Очистка и ограничения

После прерывания среды проверено: порт 3213 не слушается,
процессов E.3 preview и изолированного headless Chrome нет.
Автоматическое удаление временного каталога заблокировано политикой инструмента.
Обход блокировки не предпринимался. Остался вне репозитория:

`C:/Users/admin/AppData/Local/Temp/kinoluma-e3-ui-9719389cc14d48ce88866e21c95db6dd`

В нём находятся mock-конфигурация, placeholders, preview output и junction node_modules.
Junction ведёт к зависимостям проекта: при ручной уборке удалять только ссылку,
не её целевой каталог. Harness не импортируется проектом и не входит в его release tree.

Новых TMDB/PoiskKino/Supabase/DB-запросов: **0**.
Браузер выполнял только loopback-запросы; external routing attempts — 0.
Node guard блокировал внешние попытки при старте Next dev до отправки.
Локальный /api/player/vibix обслуживался заглушкой, а не production Route Handler.

VPS/production, .env.local, canonical IDs, main, Smart Search, SSH/пароли не менялись.
История credentials не читалась. Нет commit/push, CI, deployment или повторного импорта.

Функционально готово к отдельно согласованной подготовке release.
До полного закрытия этапа требуется уборка временного каталога.
Существующие lint-диагностики и реальные DB overrides — явно непроверенные/неустранённые ограничения.
Полный Linux CI и production QA не выполнялись.
