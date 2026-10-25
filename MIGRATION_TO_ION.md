# Migration to ION

Этот файл — рабочий план превращения MyTonWallet в ION Wallet. Он фиксирует согласованный объём миграции, фактический статус и блокеры. Внешние ссылки, store/registry-записи и графические материалы ведутся отдельно в [реестре ресурсов](REBRANDING_RESOURCE_REGISTRY.md). Обновляем оба файла после каждого законченного блока работы.

## Цель

Выпустить ION Wallet на базе MyTonWallet для сети ION (TON-совместимая сеть) и ION в BNB Chain. Оставляем Capacitor-приложения для Android и iOS, а также web, расширение браузера и Electron. Ненужные продукты, сети, бренды и инфраструктурные зависимости удаляем.

## Текущее состояние

Базовый код сверён с origin/master (3e2675ddf, PR #28). Локально завершена зачистка остатков MFA, legacy swap и Ledger; типы, линтеры, все 1004 Jest-теста и production webpack проходят. Подробные статусы — ниже и в [реестре ресурсов](REBRANDING_RESOURCE_REGISTRY.md). Native-сборки и внешние интеграции требуют отдельной проверки.

`ApiChain` содержит `ton` и `bnb`; внутренний ID `ton` обслуживает сеть ION. ION Explorer подключён; неподтверждённые testnet/marketplace/help/install переходы скрыты. Результаты P1 приведены в реестре ресурсов.

| Область | Статус | Что сделано |
| --- | --- | --- |
| Capacitor | ✅ | Восстановлены мобильные Android/iOS-обёртки Capacitor. Старое нативное Air-приложение удалено. |
| Лишние продукты | ◐ | Удалены Portfolio, включая token net worth graph и его backend endpoint, а также POST-запрос ассетов и экран расширенной информации токена; Multisend, MyCoin и его vesting, nominator staking, покупка и продажа за банковские карты. Giveaway и модуль My Wallet Cards удалены; обычные карточки аккаунтов и палитры остаются. |
| Сети | ✅ | Удалены Tron и Solana. Из EVM оставлена BNB Chain с ION BEP-20 и нативным BNB для газа. Внутренний ID сети ION — `ton`. |
| Бренды и Explorer | ◐ | Удалены Gram Wallet и его iOS widget extension. Переименованы web/npm, Android и iOS targets, desktop-артефакты, package IDs, ION Gateway/EIP-6963 identifiers и основные deep link-схемы в ION Wallet. |
| История релизов и CI | ✅ | Удалены changelogs и неактуальные build/deploy-пайплайны. |
| ION API и инфраструктура | ◐ | Клиент настроен на прямые ION indexer `/indexer/v3` и RPC `/http/v2/jsonRPC`. Deployment и end-to-end проверка wallet backend остаются открытыми. Firebase использует заглушки. |
| Agent | ✅ | Удалены оставшиеся ключи storage и локализаций, CI-задачи, иконки, анимации, CSS и комментарии. |
| iOS-проект | ◐ | IONWallet targets присутствуют, но остаются AirWidget-ссылки на отсутствующий файл; актуальная Xcode-сборка не подтверждена. См. P0. |

## Продуктовый объём

- Поддерживаются сети ION и BNB Chain. Отдельная сеть TON не входит в продуктовый объём.
- Нативный Air не возвращаем. Мобильные приложения работают через Capacitor.
- Механизм миграций хранилища сохраняем, но проектные миграционные шаги не переносим.
- Кастомизация кошелька без NFT Cards может остаться; My Wallet Cards и их minting удаляем полностью.
- Token staking и liquid staking сохраняем; nominator staking — нет.
- Аппаратные кошельки (Ledger) не поддерживаем.
- ION должен быть доступен как нативный актив сети ION и как единственный поддерживаемый ION-токен в BNB Chain.

## Открытая работа

### P0 — необходимое до первого рабочего релиза

- [x] **Удалить MFA / Telegram 2FA.**
  - Удалены отдельная сборка, npm-команды, экран настроек, ассеты, контракты, сетевые обращения, состояния интерфейса, локализации и каталог `src/mfa`.
  - Удалены оставшиеся строки Telegram 2FA и устаревшие обещания защиты после компрометации seed, а также неиспользуемая иконка Telegram-меню. Обычные пароль/PIN, биометрия и антифишинг Telegram-ссылок сохранены.

- [x] **Удалить Telegram Mini App.**
  - Удалены отдельные сборки и CI-задача, SDK, Telegram-биометрия, полноэкранный режим и элементы интерфейса Mini App и специальная поддержка Telegram Gifts.
  - Удалены продуктовые ссылки на Telegram support, news и tips; антифишинговая проверка внешних `t.me` ссылок сохранена.

- [x] **Удалить gasless / Diesel.**
  - Удалены расчёт и оплата комиссий Diesel, backend-вызовы, платёжный шлюз и варианты интерфейса для переводов и свапов.

- [x] **Удалить legacy swap и подготовить ION Exchange.**
  - Удалены неиспользуемые swap hooks, intent/match модели, storage keys и очередь записи reconciler, Swap-стили, режим PasswordForm, swap-push, недостижимые ветки activity, fee address, slippage и legacy переменные workflow/webpack.
  - Из каждого из 12 словарей удалено по 77 неиспользуемых строк MFA/Telegram, Ledger и legacy swap. Текст WalletConnect Pay больше не предлагает удалённые buy/swap-функции.
  - Ссылки ion://swap открывают только оболочку Exchange. Wire-типы indexer, обработка сторонних on-chain DEX/liquidity сообщений и пагинация обычной истории сохранены.
  - Удалены DEX/CEX swap: `/swap/*`, провайдеры, котировки, маршруты, slippage, комиссии, подпись swap-транзакций, история и reconciliation swap-активностей.
  - Оставлена только оболочка окна **Exchange** с фиксированной парой `ION (ION Network) → ION (BNB Chain)`; она не создаёт транзакцию.
  - После утверждения bridge-контракта, получателя и модели комиссии реализовать внутри этой оболочки обычный перевод ION на bridge-адрес и обработку его статуса (P1).

- [x] **Завершить удаление Agent.**
  - Удалены продуктовые строки и storage keys Agent, CI-проверки и Chromium e2e-задача, иконки, анимации, CSS-классы и конфигурационные упоминания.
  - Нейтральные упоминания браузерного `userAgent` и стороннего dApp `agents.ton.org` сохранены: они не включают функциональность Agent.
  - Критерий выполнен: в пользовательском интерфейсе, сборках и CI Agent больше не существует.

- [x] **Удалить My Wallet Cards.**
  - Удалены NFT collection, minting, CDN, кастомные NFT-фоны, меню, локализации и неиспользуемые ассеты Cards. Отдельной очистки старых Cards-полей в migrateCache сейчас нет; обычные фоны и оставшиеся специальные ресурсы проверяются по реестру ресурсов.
  - Обычные карточки аккаунтов, темы и палитры сохранены; палитры больше не требуют NFT Cards.

- [x] **Проверить Giveaway.**
  - Поиск по `src`, `mobile` и `public` не находит оставшегося Giveaway-кода; `app_giveaway_url` удалён из Android ресурсов.

- [x] **Удалить интеграцию с аппаратными кошельками Ledger.**
  - Удалены оставшиеся settings_ledger.svg и строка ограничения Ledger из всех 12 словарей.
  - Удалены SDK и транспорты (WebHID, WebUSB, BLE, USB HID), подпись TON через Ledger, тип аккаунта `hardware`, шаги подключения и подтверждения во всех сценариях, отдельная вкладка расширения, vesting-подпись, Capacitor-плагины, Bluetooth-разрешения Android/iOS, HID-доступ Electron (теперь явно запрещён), иконки, ассеты и локализации.
  - Кэш не мигрируется: у ION Wallet ещё нет выпущенных пользователей.

- [x] **Удалить TON-специфичные интеграции Fragment, Notcoin vouchers и Ethena.**
  - Удалены Fragment collections, NFT-меню, marketplace-метаданные и тестовые trace fixtures; Notcoin voucher exchange/burn flow; Ethena USDe/tsUSDe staking, контракты, backend-модели, activity parsing, интерфейс и локализации.
  - Обычные NFT, общий burn NFT, liquid staking и jetton staking сохранены.

- [ ] **Подтвердить сборку текущего iOS Capacitor-проекта.**
  - В project.pbxproj остаются PBXFileReference/PBXGroup AirWidgetBundle.swift/AirWidget на отсутствующий файл. Это не доказывает падение сборки, но зачистка ссылок не завершена.
  - Прежние CocoaPods/Xcode проверки требуют повторения на macOS для актуальных IONWallet targets; native-сборки и запуск на устройствах в этой зачистке не выполнялись.

- [ ] **Подтвердить ION activity API в целевой сборке.**
  - Read-only проверка 22.10.2026: actions/traces отвечают HTTP 200, RPC getMasterchainInfo — ok: true, pending API — HTTP 500. Полный сценарий history/send и env-параметры release/preview требуют проверки.
  - ION v3 indexer (`https://api.mainnet.ice.io/indexer/v3`) совместим: `/actions` (включая `action_id` и фильтры), `/traces` по `trace_id`/`msg_hash`/`tx_hash`, `/messages`, `/transactions`, `/jetton/wallets`, `/nft/items`, `/nft/transfers`, `/addressBook`, `/walletStates`, `/accountStates`, `/metadata` отвечают в формате, который ждёт клиент. RPC v2 — `https://api.mainnet.ice.io/http/v2`.
  - Отличия ION учтены в клиенте: нативный перевод называется `ion_transfer`, провайдер ликвидного стейкинга — `ionstakers`.
  - Кошелёк ходит в ION API напрямую: пути `/indexer/v3` и `/http/v2`, без Toncenter-заголовков `X-Actions-Version` и `X-App-Origin`, которые не пропускает CORS ION.
  - Не хватает на стороне ION (кошелёк работает без них): `/pendingActions` и `/pendingTraces` отвечают `500 emulatedTracesRepository is not initialized` — нет ожидающих операций до подтверждения; `/api/emulate/v1/emulateTrace` нет — комиссия считается через `estimateFee`, превью действий в dApp-транзакциях не показывается; streaming WebSocket нет — см. `NO_WEBSOCKET`. Публичного ION testnet API нет.

- [ ] **Убрать зависимость preview от MyTonWallet backend.**
  - ✅ `GET /assets` перенесён в ION backend. Slug токена теперь `<chain>-<полный канонический адрес>` (EIP-55 для BNB, bounceable для ION) вместо 10 символов в нижнем регистре: обрезанный slug позволял поддельному токену совпасть с настоящим.
  - Полный список endpoint-ов, которые клиент ждёт от ION backend: [ION_BACKEND_API.md](ION_BACKEND_API.md).
  - Все endpoint-ы кошелька реализованы в ION backend, кроме двух отложенных: `/prices/chart/*` (графики цены пока пустые) и WebSocket `/{testnet/}ws` (выключен `NO_WEBSOCKET`). Подписки на уведомления сохраняются, пуши не отправляются. Каталог dApp пуст, вкладка Explore скрыта.
  - Осталось развернуть ION backend на `api.wallet.ice.io` и проверить все сценарии против него.
  - После решения проверить, что все runtime запросы к backend идут к утверждённому ION-сервису, а не к MyTonWallet; сами GitHub forks в `package.json` остаются закреплёнными исходниками зависимостей до появления ION forks.

- [x] **Принять решение по каждому оставшемуся полю `/utils/get-config`.**
  - `isLimited`: ION backend отдаёт `false`, региональных ограничений нет.
  - `country` и `isWebSocketEnabled`: удалены из контракта и клиента — клиент их не читал.
  - `now`: серверное время для предупреждения о неверных часах устройства.
  - `isCopyStorageEnabled`: `false`, экспорт диагностических данных выключен.
  - `isUpdateRequired`: пока `false`. Перед релизом нужен источник версий для App Store, Google Play и desktop (P1).
  - Уже удалены без замены: `seasonalTheme`, `isNegVerdictCacheEnabled`, `isTonConnectAnalyticsEnabled`, `supportAccountsCount`, `knowledgeBaseVersion`, `isVestingEnabled`, `/account-config`, `/referrer/get`, `/attribution/claim`, `/nfts/report`, promotion UI, сезонные ресурсы, install attribution, NFT reporting, negative-verdict cache и TonConnect telemetry.

Локальные проверки зачистки P0 (22.10.2026): npm run check — успешно; Jest — **981 passed, 115 suites, 0 failed**. Тесты курсора истории покрывают confirmed/failed, local, pending/pendingTrusted, fallback и пропущенные ID вместо backend-swap сценариев. check:branding, генерация default/Android локализаций и production webpack проходят; у webpack только предупреждения о размере bundle. CI больше не вызывает отсутствующий sdk:build:slim: используются актуальные типы/линтеры, Jest, проверка графики и production webpack. Все npm script references в workflow проверены локально; запуск GitHub Actions этим проходом не подтверждается.

### P1 — подготовка продукта к ребрендингу и выпуску

- [x] Переименовать основные пакеты, артефакты и нативные цели в **ION Wallet**.
  - npm package: `ion-wallet`; Capacitor app ID: `io.ionwallet`; Android flavor: `ionwallet`; iOS schemes: `IONWallet*`.
  - Desktop-артефакты: `IONWallet-*`; Android direct APK: `IONWallet.apk`.
  - Удалён iOS target и ресурсы Gram Wallet, включая widget extension.
  - Android `:app:assembleIonwalletProdDebug` после смены ID проходит; APK имеет `io.ionwallet.debug`. iOS native build ещё требуется.
- [x] Заменить локальные схемы `ton://` и `mtw://` на `ion://`.
  - Для собственного ION Gateway-канала используется `ion-gateway://`. Стандартный входящий URI ION Gateway `tc://` сохранён для совместимости с официальным SDK; public links ION Gateway перенесены на `connect.ionwallet.io`.
- [x] Сохранить отдельный Capacitor WebView origin `https://ionwallet.local`.
  - Это технический локальный origin native-обёртки; он не заменяет публичные Universal Links и App Links на `connect.ionwallet.io`.
- [x] Удалить перенос legacy auth в Enclave.
  - ION Wallet создаётся сразу с Enclave: старые encrypted mnemonic, legacy biometric storage, rollback и recovery UI не поддерживаются.
- [ ] Завершить внешнюю инфраструктуру и публикацию. См. [реестр ресурсов](REBRANDING_RESOURCE_REGISTRY.md).
  - Новый отдельный домен кошелька — `ionwallet.io`; ION Gateway bridge — `bridge.ionwallet.io`, Universal Links и App Links — `connect.ionwallet.io`. DNS, TLS и обмен сообщением через SSE на `bridge.ionwallet.io/bridge/` проверены; `connect.ionwallet.io` ещё требует исправить TLS и опубликовать маршруты.
  - Опубликовать на `connect.ionwallet.io` `apple-app-site-association`, `assetlinks.json` и маршруты ION Gateway/WalletConnect. Сверить домен и package ID `io.ionwallet` с ION Gateway registry, WalletConnect и store metadata.
  - Текущие `wallet.ice.io` URL — временные кодовые значения, а не доказательство готового сайта, API, help-центра, legal-страниц, загрузок или CDN. Для каждого нужен опубликованный ресурс или удаление ссылки.
  - Неподтверждённые Android blog/install/help/scam/APK URL удалены. Website, terms/privacy и association-конфигурация ожидают публикации; signing и stores проверяются отдельно.
  - Перед Android-релизом установить настоящий `mobile/android/app/src/ionwallet/google-services.json` из ION Firebase Console и проверить соответствие `io.ionwallet`, release signing certificate и Firebase-проекту ION Wallet. Для Firebase Distribution также требуется `ANDROID_FIREBASE_APP_ID` нового приложения.
  - Firebase-конфигурация заменена на нерабочую ION-заглушку: Android собирается, а iOS не вызывает `FirebaseApp.configure()` до установки настоящего `GOOGLE_APP_ID`. Перед выпуском нужны конфиги из ION Firebase Console.
  - Зарегистрировать и проверить ION Wallet в ION Connect и WalletConnect, включая metadata, package IDs, deep links, icon и policy URL.
  - Создать и оформить App Store Connect и Google Play Console приложения: signing, privacy/data disclosure, store listing, screenshots, support/policy URLs и тестовые каналы.
  - Опубликовать доменные association-файлы (`apple-app-site-association`, `assetlinks.json`) и рабочие ION backend endpoint-ы.
  - GitHub forks и npm scopes старого проекта пока сохранены только как закреплённые источники зависимостей; их нельзя переименовывать, пока не созданы эквивалентные ION forks.
- [ ] Утвердить и заменить все иконки, logo, splash и store assets по [реестру ресурсов](REBRANDING_RESOURCE_REGISTRY.md).
  - 17.10.2026, ветка `rebrand/ion-ui`: выполнен проход по UI — логотипы, web/PWA/QR/dApp icons, Electron ICO/ICNS, Android launcher/splash/notifications, iOS AppIcon/intro, карточки и иллюстрации заменены на ION. About и onboarding обновлены на 12 языках. Экспорт воспроизводится через `npm run build:branding`, анимации проверяются штатным RLottie через `npm run check:branding`.
  - TypeScript/ESLint/Stylelint, 1000 Jest-тестов (120 suites), 13 анимаций, генерация web/Android локализаций и production webpack проходят. Утверждение графики и native-device проверки остаются открытыми.
  - Production Capacitor web-бандл собран; `cap copy android` и `cap copy ios` прошли. Нативные сборки и запуск на устройствах здесь не выполнялись.
- [ ] Поддерживать README без унаследованных непроверенных маркетинговых заявлений; добавить публичные ссылки только после их публикации.
- [ ] Утвердить bridge-путь ION между ION Network и BNB Chain.
  - Зафиксировать контракт/адрес получателя, сеть-источник и сеть-назначение, правила amount/fee и подтверждения.
  - После этого включить создание обычной bridge-транзакции в сохранённом окне Exchange.
- [ ] Включить обязательное обновление клиента через `isUpdateRequired` в `/utils/get-config`.
  - Клиентская блокировка реализована, включая отсутствие download URL. Electron updater и оконные кнопки остаются смонтированы; скачанное обновление доступно с обязательного экрана. При включённом автообновлении Electron доступный новый web-интерфейс можно загрузить перезагрузкой, даже при ошибке нативного updater; скачанный установщик имеет приоритет. При выключенном автообновлении перезагрузка локального bundle не предлагается. На backend определить источник минимальной версии для App Store, Google Play и desktop и сравнивать с `X-App-Version` клиента.
- [ ] Подготовить Electron publish-конфигурацию к выпуску.
  - Текущий `src/electron/config.yml`: generic publish URL `https://s3.wallet.ice.io/public/desktop`, artifact name `IONWallet-${arch}.${ext}`. Staging workflow при пустом `PUBLISH_REPO` переключает feed на `/desktop-beta` и задаёт versioned mac artifact name `IONWallet-${version}-${arch}.${ext}`. Подтвердить каналы выпуска, не подменяя production-конфигурацию staging-значениями без решения.
  - Сохранить `extraMetadata.productName: IONWallet`: от него зависят userData и keychain; переименование требует отдельной миграции.
  - Одновременно сверить update feed, `package-and-publish.yml` и публичную desktop download-страницу, чтобы имена файлов и URL совпадали.
- [x] Заменить `TON_DNS_ZONES` на единственную ION DNS-зону `.ion` (коллекция `EQD-T0TF…Fb5E`); картинки доменов — `dns.ice.io/meta/img`, «Configure DNS» открывает `dns.ice.io`, домены владельца бэкенд берёт из ION DNS API.
- [x] Выполнить локальную URL-часть P1 и составить проверяемый контрактный реестр. См. [реестр ресурсов](REBRANDING_RESOURCE_REGISTRY.md#реестр-контрактов-и-runtime-идентификаторов).
  - ION Explorer: address/jetton/transaction/nft/collection routes; старые explorer ID используют fallback. Неподтверждённый testnet скрыт. Explorer открывается внешне без embedded dApp bridge.
  - ION marketplace/Getgems и глобальный выбор OpenSea удалены; BNB object links сохранены. NFT/коллекции остаются без CTA при отсутствии URL.
  - JVault, help/scam links и dangling CTA удалены во всех 12 локализациях; предупреждения сохранены. Slug toncoin не открывает CoinMarketCap TON.
  - Install/download URL задаются явно в APP_DOWNLOAD_URLS; неподтверждённые предложения скрыты. isUpdateRequired блокирует приложение и без download URL. Terms/privacy и consent не изменены.
  - Liquid pool/jetton подтверждены официальным staking frontend и mainnet API; staking slug проверен как производный. Контракты, derivation и операции не менялись.
- [ ] Подтвердить оставшиеся deployments у ION: BEP-20 issuer/bridge, DNS collection, FIVA/Affluent hashes, burn protocol guarantee и все testnet/env overrides. PushEscrow wrappers не имеют runtime импортов/configured deployment; это не готовая ION-интеграция.
- [ ] Завершить переход публичного моста с TON Connect на ION Gateway после утверждения схемы и регистрации протокола.
  - Сейчас extension публикует один мост под `window.ionwallet.ionconnect` и временным совместимым alias `window.ionwallet.tonconnect`.
  - После фикса окончательных URI-схем, manifest/registry-записей и требований ION Gateway заменить или удалить legacy alias, старые bridge identifiers и пользовательские упоминания TON Connect.
- [ ] Снять `NO_WEBSOCKET`, когда ION начнёт отдавать update-сокет.
  - `.env.example` рекомендует `NO_WEBSOCKET=1` и `NO_PENDING_ACTIVITIES=1`; код отключает их только при значении `1`, а webpack defaults — `0`. Проверять реальные env-параметры каждой сборки: отключение не гарантировано по умолчанию.
- [ ] Пересмотреть CI после удаления Agent: оставить только проверки актуальных web и Capacitor целей.
- [ ] Попросить ION включить в индексаторе emulated traces (`/pendingActions`, `/pendingTraces`), `emulateTrace` и streaming WebSocket.
- [ ] Перевести предпросмотр `wallet.lab.windbit.dev` на прямые адреса ION API (`/indexer/v3`, `/http/v2`) вместо nginx-маппинга `/ion/api/*`, и закоммитить оставшуюся nginx-конфигурацию, если она остаётся частью инфраструктуры.

### P2 — проверка перед выпуском

- [x] TypeScript, ESLint, Stylelint, Jest и production webpack build — локально 22.10.2026, 981 тест, без падений; повторять для release commit.
- [ ] Web: создание и импорт кошелька, receive, send, Exchange shell, staking, история, токены и ION Gateway.
- [ ] Extension и Electron: запуск и основные пользовательские сценарии.
- [ ] Android Capacitor: `cap sync`, сборка, запуск, биометрия, QR, ссылки и уведомления.
  - 23.10.2026: в отдельном worktree от `d8f41f205` собран production Capacitor web-бандл, выполнен `cap sync android` и успешно собран `:app:assembleIonwalletProdDebug` (362 задачи). APK: `io.ice.wallet.debug`, `1.0.debug`, minSdk 24, targetSdk 37; подпись v2 проверена apksigner. Firebase остаётся заглушкой. APK установлен и запущен на эмуляторе Google APIs x86_64 API 37. Проверены onboarding, прямой переход к PIN без отсчёта, ввод и подтверждение PIN, переход к экрану резервной копии. Секретные слова не открывались. Проверка аккаунта после backup, биометрия, QR, ссылки и push, а также физическое устройство остаются открытыми; в журнале WebView есть Failed to fetch. После sync сохранён исходный путь к собственному `native-dialog`; стандартный Capacitor sync его перезаписывает.
- [ ] iOS Capacitor: `cap sync`, Xcode build, запуск, биометрия, QR, ссылки и уведомления.
- [ ] Ручная проверка с ION RPC и BNB Chain без обращений к удалённым сетям и продуктам MyTonWallet.

## Известные технические факты

- Предпросмотр на Home Lab уже умеет проксировать ION RPC v2. В нём также устранены утечка basic-auth заголовка в upstream и ошибочный SPA fallback для отсутствующих API.
- ION v3 indexer совместим с клиентом, но без emulated traces, `emulateTrace` и streaming. Подробности — в P0 «ION activity API».
- Прежние native-проверки: Android `:app:assembleIonwalletProdDebug` с Firebase-заглушкой; iOS `cap sync ios --deployment`, CocoaPods и Xcode. В текущей локальной зачистке native-сборки не повторялись; актуальная iOS-проверка открыта в P0.
- В текущем checkout нет файла `AGENTS.md`. Запрошенная зачистка Agent относится к остаткам функциональности в коде и CI, перечисленным выше.

## Как обновлять план

После завершения пункта отмечаем его галочкой, добавляем ссылку на коммит и коротко фиксируем проверку. Если появляется новый блокер или решение меняет объём работы, сначала обновляем этот файл, затем код.

## Проверки P1

`npm run check`, Jest (1004 tests / 120 suites), `npm run i18n:build:default`, `npm run i18n:build:android`, `npm run check:branding` и production webpack проходят. У webpack остаются 2 предупреждения о размере bundle. URL-тесты покрывают все ION routes, base64/hex hash, legacy IDs, отсутствие testnet/marketplace, выбор base URL по ID и сохранение BNB routes. UI-тесты проверяют отсутствие NFT buy CTA/пустых ссылок, все 12 переводов и обязательный update screen без URL и возможности отменить блокировку. Отдельно проверены установка Electron-обновления, скачанного до/после блокировки, ошибка updater, отсутствие канала, ручной подтверждённый URL и сохранение оконных кнопок. Интеграционный тест меню адреса проверяет встроенное открытие BNB на Capacitor и внешнее открытие ION.

Проверка исправления Electron: 11 тестов AppShell/UpdateAvailable проходят, включая перезагрузку доступного web-интерфейса до/после блокировки, ошибку нативного updater, запрет перезагрузки локального bundle и приоритет скачанного установщика. В полном Jest-прогоне прошёл 1001 тест; три теста файлового хранилища получили EPERM на rename в системной TEMP-папке песочницы и успешно прошли повторно с TEMP/TMP внутри проекта. `npm run check` проходит.

Браузерная проверка частичная: проверены пустое NFT-состояние, отсутствие install/help-предложений в Settings и исчезновение install security banner; backup warning сохранён. На публичном ION pool в режиме просмотра загрузились баланс и история, открыт receive с ION-адресом, explorer-кнопкой и предупреждением «это НЕ ваш кошелёк». Пустое NFT-состояние не содержит purchase CTA. Подробности истории открыты с explorer-действиями. Коллекции с данными, staking descriptions и scam conditions требуют дополнительного браузерного прохода: повторяющийся BNB RPC Failed to fetch перекрывает интерфейс dev-уведомлениями. Это не отмечено как успешный end-to-end тест. Транзакции и подписи не выполнялись.

Продолжение Android-проверки 23.10.2026: Android lint и debug-сборка проходят после точечных правок манифестов (явный exported для MainActivity во flavor; MissingClass подавлен только для tools:node=remove маркера необязательной Google scanner activity). Локальный SDK path записан с экранированным двоеточием. Instrumentation-тест AppContextTest перенесён в io.ice.wallet и проверяет допустимые ION package IDs; на эмуляторе 1 passed. Единственный локальный unit-тест остаётся шаблонным 2 + 2 и не подтверждает работоспособность кошелька. Обновлённый APK: `IONWallet-android-smoke-debug.apk`, 28816608 байт, SHA-256 `fa386963c0be099f4d7671f91c7c2b888133e980b50e0f155a585dc607b43d9b`. Транзакции не отправлялись.
