# Migration to ION

Единый рабочий план и реестр переезда MyTonWallet → ION Wallet. Сверено 25.10.2026 с историей задач «Очистка и ребрендинг Ion Wallet» и «Ion Wallet cleanup and rebrand», `origin/master` до `502dfff45` и ветками открытых PR. `README.md` остаётся публичным описанием проекта, а инструкции генератора графики — технической документацией.

**Статусы:** `[x]` — изменение есть в указанной ветке/коммите либо внешний сервис проверен; это не означает готовность релиза. `[ ]` — работа, публикация или сквозная проверка ещё требуется. Для открытых PR явно указан их статус. Исторические проверки ниже не заменяют проверку release-сборки.

## Цель и границы

- ION Wallet поддерживает сеть ION и ION в BNB Chain; внутренний ID сети ION в коде пока `ton`. Для газа в BNB остаётся BNB. Отдельную сеть TON, Tron и Solana в продукт не возвращаем.
- Оставляем web, browser extension, Electron и мобильные оболочки **Capacitor** для iOS/Android. Старое нативное приложение Air удалено. Сохраняем обычные карточки аккаунтов, темы и палитры; My Wallet NFT Cards удалены.
- Оставляем обычные переводы, NFT, token/liquid staking и защиту от неподдерживаемых multisig-отправок. Не возвращаем Portfolio, Multisend, MFA, Agent, Telegram Mini App/Gifts, gasless/Diesel, Ledger, nominator staking и DEX/CEX swap.
- Окно Exchange остаётся оболочкой для будущего переноса ION между ION Network и BNB Chain. Сейчас оно **не создаёт транзакцию**: нужны утверждённые bridge-контракт, получатель, комиссия и обработка статуса.

## Состояние веток

- `origin/master` (`502dfff45`) содержит подтянутые сегодня коммиты `4c6a70954` (зачистка legacy swap/MFA/Ledger и CI), `d8f41f205` (внешние ссылки, проверка контрактов), `502dfff45` (Android build, исправления создания кошелька). Отмеченные ниже пункты учитывают эти коммиты.
- [PR кошелька #29](https://github.com/troman29/ion-wallet/pull/29) открыт: переключает SSE-мост на `https://bridge.ionwallet.io/bridge/`. В `master` и ветке PR #30 до его слияния всё ещё указан старый адрес.
- [PR кошелька #30](https://github.com/troman29/ion-wallet/pull/30) — черновик: `io.ionwallet`, `connect.ionwallet.io`, мобильные release-переменные, защитные проверки подписания и маршрутизация ссылок. Этот документ обновляется в его ветке; после слияния статус пунктов нужно пересверить.
- [PR инфраструктуры #1](https://github.com/troman29/homelab/pull/1) открыт; bridge, `connect.ionwallet.io` и временная страница `ionwallet.io` уже развёрнуты на infra.
- [PR реестра ION Gateway #4](https://github.com/ice-blockchain/wallets-list/pull/4) — черновик. Запись кошелька подготовлена, подключение и подпись через staking dApp ещё не проверены.
- В основной рабочей копии `codex/fix-web-wallet-creation` есть **незакоммиченные** изменения: создание 24-словного ION-only кошелька по умолчанию с env-переключателем, фильтрация BNB-токенов в ION-only аккаунте и выключение скрытия мелких переводов по умолчанию. Пока они не в `master` и не в PR #30, ниже они не отмечены выполненными.

## 1. Код и продукт

- [x] Удалены отдельные Portfolio и Multisend, график net worth и связанные backend-запросы; защита multisig сохранена.
- [x] Удалены MFA/Telegram 2FA, Telegram Mini App/Gifts, Agent, gasless/Diesel, Giveaway, My Wallet Cards и связанные UI, API, CI, ассеты и локализации.
- [x] Удалены legacy DEX/CEX swap, Ledger, Tron, Solana, TON-специфичные Fragment/Notcoin vouchers/Ethena, MyCoin/vesting и nominator staking. Сохранены общие NFT/jetton transfer, liquid/token staking, темы и палитры.
- [x] Оставлена оболочка Exchange с фиксированной парой ION Network ↔ ION в BNB Chain; бывший swap deeplink открывает только её.
- [x] Восстановлены Capacitor-оболочки; удалены Air и Gram Wallet widget extension. iOS Simulator `IONWallet` и Android debug собираются в ветке PR #30.
- [x] Удалена миграция legacy auth в Enclave; первое приложение использует Enclave. Механизм версионирования кэша сохранён.
- [x] TonAPI, старые STON/pTON адреса и `tonsite://` убраны из рабочего кода; используется `ionsite://`. `TON_DNS_ZONES` содержит одну зону `.ion`. Назначение resolver всё ещё требует подтверждения владельца ION.
- [x] В коммите `502dfff45` исправлены создание кошелька и ожидание BNB RPC при BIP39 discovery: после 10 секунд предусмотрен offline fallback. Это не подтверждает работу BNB indexer в production.
- [ ] Довести и закоммитить текущие локальные изменения для ION-only кошелька, списка токенов и настройки мелких переводов; проверить создание, импорт и сохранённые настройки в web.
- [ ] Утвердить bridge-контракт и реализовать в Exchange перевод ION с безопасным подтверждением сети, адреса, комиссии и статуса.
- [ ] Провести заключительный аудит доступных пользователю TON/MyTonWallet/GramWallet имён и оставшихся legacy-функций. Совместимые storage keys, dependency forks и внутренний `ton` менять только с отдельной миграцией.

## 2. ION API, backend и контракты

- [x] Клиент использует ION indexer `/indexer/v3` и RPC `/http/v2/jsonRPC`; `ion_transfer` и `ionstakers` учтены. ION Explorer mainnet подключён, неподтверждённые testnet/marketplace/help/install переходы скрыты.
- [x] Нужные wallet endpoint-ы реализованы в `troman29/ion-staking-backend` (`origin/master` включает PR #12); список и назначение — в разделе «Контракт backend API» ниже. Старые `/account-config`, `/market/assets`, `/portfolio/net-worth-by-asset`, POST `/assets`, `/swap/*`, attribution/report endpoints удалены из клиента.
- [x] `/utils/get-config` сокращён до `isLimited`, `now`, `isCopyStorageEnabled`, `isUpdateRequired`; сезонные темы, negative-verdict cache, TonConnect analytics, `supportAccountsCount`, `swapVersion`, `knowledgeBaseVersion`, `isVestingEnabled` удалены.
- [x] ION Wallet API выведен на `https://api.ionwallet.io` через существующий `ion-staking-backend`; DNS-запросы проксируются к `ion-dns-backend` по внутренней сети. 25.10 проверены DNS A-запись, TLS, `/test`, `/assets`, GET и CORS preflight `/dns/getDomains` для `https://ionwallet.local` с `X-App-Origin`.
- [ ] Настроить надёжные BNB RPC **и индексатор истории токенов**. Текущий `evmapi.wallet.ice.io` не разрешался при проверке 23.10; Zerion в клиенте пока остаётся. Выбор замены и её backend-контракт не утверждены.
- [ ] Решить судьбу графиков `/prices/chart/*`; сейчас они пустые. Подписки push сохраняются, но отправка ждёт Firebase и мобильных приложений.
- [ ] Получить от ION `/pendingActions`, `/pendingTraces`, `emulateTrace` и streaming WebSocket либо оставить явные feature flags. Проверка 22.10: pending endpoints отвечали HTTP 500; `.env.example` рекомендует `NO_PENDING_ACTIVITIES=1` и `NO_WEBSOCKET=1`, но defaults webpack — `0`.
- [ ] Подтвердить у владельца ION адрес BEP-20 токена/issuer и bridge, `.ion` DNS resolver, FIVA/Affluent code hashes, burn guarantee, testnet и все env overrides. Mainnet read-only наблюдение не заменяет подтверждения получателя транзакции.
- [ ] На backend определить источник минимальных версий для App Store, Google Play и desktop, затем включить `isUpdateRequired`; клиентский экран блокировки без download URL уже реализован.

## 3. ION Gateway и ссылки

- [x] `ion-gateway://` используется как схема кошелька, `ion://` — собственные ссылки; стандартный `tc://` остаётся входящим URI SDK. Пользовательский интерфейс переименован в ION Gateway.
- [x] Мост v3 работает на `bridge.ionwallet.io`: HTTPS, Redis Cluster из трёх узлов и внешний POST → SSE round trip проверены. Все узлы находятся на одном VPS.
- [x] `connect.ionwallet.io` отдаёт fallback для `/` и `/wc` по HTTPS; точный origin/path проверяется в коде PR #30, lookalike hosts отвергаются. `ionwallet.io` отдаёт временную страницу с действительным сертификатом.
- [x] Подготовлены отдельный PR #29 для URL моста и черновой PR #4 в `ice-blockchain/wallets-list`.
- [ ] Слить/согласовать PR #29 и #30, затем проверить подключение, `SignData` и отправку транзакции из `ion-staking-dapp` через extension и mobile QR/deep link. Dapp использует ION Gateway protocol v2 через `@ion-gateway/ui`/SDK и берёт bridge URL из wallet registry.
- [ ] После регистрации мобильных приложений опубликовать `apple-app-site-association` и `assetlinks.json` на `connect.ionwallet.io` без редиректов; шаблоны лежат вне web root, сейчас оба URL возвращают 404. Нужны **новый** Apple Team ID и SHA-256 сертификата Play App Signing для `io.ionwallet`.
- [ ] Зарегистрировать WalletConnect project ID и проверить metadata, redirect, `ion-wc://` и `/wc`; сейчас `WALLET_CONNECT_PROJECT_ID` по умолчанию пуст.
- [ ] После утверждения схем и проверки совместимости пересмотреть alias `window.ionwallet.tonconnect` и прочие legacy protocol identifiers; не удалять их преждевременно.

## 4. Мобильный выпуск и внешние ресурсы

- [x] В PR #30 Android application ID/Java packages и iOS bundle ID переведены на `io.ionwallet`; Capacitor WebView origin оставлен `https://ionwallet.local`. Старые Apple Team/App Store Connect IDs удалены из defaults; мобильный релиз CI запускается только вручную и проверяет Team ID, bundle ID и provisioning profile.
- [x] Firebase-файлы заменены безопасными нерабочими заглушками. Старые mobile associated domains убраны, EIP-6963 reverse DNS ID — `io.ionwallet`; ссылки на отсутствующие legal-страницы скрыты.
- [x] Основные ION icon/logo/splash, web/PWA, Electron, Android/iOS и 13 анимаций с превью экспортированы; генерация воспроизводима через `npm run build:branding`.
- [x] 29.10.2026 в Google Play Console аккаунта Roman T создано приложение ION Wallet с пакетом `io.ionwallet`; выбраны категория «Финансы», `support@ionwallet.io`, отсутствие рекламы и рекламного ID, функция «криптовалютный кошелёк», отсутствие государственных и медицинских функций.
- [x] Опубликована политика ION Wallet на `https://ionwallet.io/privacy-policy/` (оператор Roman Tepliakov, `support@ionwallet.io`). Сейчас в политике указано 16+, а в Play выбраны группы 16–17 и 18+; это предварительный выбор, требующий пересмотра до выпуска. В Play также сохранены доступ без серверного аккаунта, английское и русское описания, иконка и баннер.
- [x] Заполнена и сохранена анкета IARC: Google Play показывает статус «Выполнен». Текущий рейтинг: USK 16+ в Германии, PEGI 3+ в Европе, IARC 3+ для остальных стран. IARC автоматически выдаёт рейтинги по ответам анкеты; эти оценки описывают содержание приложения и не устанавливают минимальный возраст пользователей кошелька.
- [ ] До отправки в Google Play определить допустимые страны и целевую аудиторию по реальной функциональности кошелька и стейкинга. Если планируется доступ с 14 лет, пересмотреть возрастные группы Play (включая 13–15), требования к приложениям для несовершеннолетних и текст публичной политики; не считать 16+ юридически подтверждённым порогом. Источники: [Google Play Target audience](https://support.google.com/googleplay/android-developer/answer/9867159), [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843).
- [ ] Разрешить вопрос с типом аккаунта разработчика: [Google Play требует Organization для cryptocurrency software wallets](https://support.google.com/googleplay/android-developer/answer/10788890), а текущий аккаунт Roman T — Personal. Проверить путь [перехода Personal → Organization](https://support.google.com/googleplay/android-developer/answer/16260648), наличие юридического лица и D-U-N-S; до разрешения не отправлять приложение на проверку. Исключение для некастодиальных кошельков в [географических правилах криптокошельков](https://support.google.com/googleplay/android-developer/answer/16329703) само по себе не отменяет требование к типу аккаунта.
- [x] Сняты два настоящих скриншота Android 1080×2400: главный экран и отправка ION (`release-assets/google-play/screenshots/`). Скриншоты загружены в Google Play; английская карточка сохранена со статусом «Готово к отправке на проверку».
- [x] Для первого Android-релиза задана версия `1.0.0` в Gradle и Fastlane; CI больше не подставляет версию общего пакета `26.9.0`.
- [x] 29.10.2026 собран и подписан AAB `io.ionwallet` версии `1.0.0` (versionCode 1). Отдельный upload key хранится вне репозитория в macOS Keychain и локальном keystore. Это проверочная сборка из PR #33: последние незакоммиченные исправления рабочей папки в неё не входят, а Firebase-конфиг остаётся заглушкой; не выпускать её тестировщикам.
- [ ] Перед выпуском объединить последние исправления с веткой `io.ionwallet`, заменить Firebase-заглушку, пересобрать и подписать итоговый AAB новым upload key, завершить Data safety по фактическому AAB и SDK. Анкета Data safety заполнена черновиком, перед отправкой нужна сверка с релизной сборкой: Firebase/Crashlytics, `X-App-ClientID`, пуши, backend logs и сроки хранения. Текущий Personal-аккаунт также требует закрытый тест минимум с 12 участниками 14 дней подряд; после решения вопроса с типом аккаунта проверить, осталось ли это требование. Тестовый APK `io.ice.wallet.debug` в Play не загружать.
- [ ] Дождаться одобрения Apple Developer Program, зарегистрировать iOS-приложение `io.ionwallet`, получить новые signing IDs/ключи, настроить App Store listing и TestFlight; затем включить автоматический мобильный релиз CI. Старые аккаунты MyTonWallet не использовать.
- [ ] Создать реальный ION Firebase project/config для Android/iOS и настроить push; проверить `gcm_sender_id`, `ANDROID_FIREBASE_APP_ID` и учётные данные CI.
- [ ] Заменить временную страницу `ionwallet.io` рабочим web-приложением; опубликовать policy/help/download, иконку для публичного `APP_ICON_URL` и проверенные ссылки в README. Пока `APP_DOWNLOAD_URLS` пуст, install CTA скрыты.
- [ ] Утвердить графику у владельца бренда; проверить все платформы, размеры, темы/палитры, QR, launcher mask, splash, уведомления и App Store assets. Обычные карточки аккаунтов не удалять.
- [ ] Подтвердить desktop signing, notarization, `src/electron/config.yml` feed `/public/desktop` и staging `/desktop-beta`, имена `IONWallet-*`, каналы обновления и download URL. `extraMetadata.productName: IONWallet` связано с userData/keychain.
- [ ] Разобрать каждый оставшийся `wallet.ice.io` runtime URL (backend, CDN, updater, self links, biometrics) и старые совместимые ключи, не заменяя адреса на неработающие строки. `get.gramwallet.io` и старые продуктовые ссылки не возвращать.

## 5. Проверки релиза

- [x] Для merged master до `d8f41f205`: TypeScript/ESLint/Stylelint, 1004 Jest-теста, branding/i18n и production webpack проходили; `4c6a70954` дополнительно убрал остатки legacy swap и исправил CI.
- [x] Для PR #30: `npm run check`, 84 целевых deeplink-теста, Android `:app:assembleIonwalletProdDebug` (`io.ionwallet.debug`), iOS `IONWallet` Simulator build (`io.ionwallet`) и GitHub Simple tests прошли. Это debug/simulator-проверки без production signing.
- [x] 23.10 Android-эмулятор дошёл от onboarding до подтверждения PIN и экрана резервной копии; Android lint и один instrumentation-тест прошли. Это была историческая сборка с прежним ID `io.ice.wallet.debug`, не доказательство работы текущего `io.ionwallet` на устройстве.
- [ ] Повторить полный CI/build на release commit и проверить web создание/импорт/receive/send/history/staking, BNB и ION, extension, Electron, Android и iOS на устройствах; тестовые переводы и подписи проводить только после проверки адресов и сетей.
- [ ] Проверить mobile biometrics, QR, App/Universal Links, push и действительные release-подписи; preview/production env flags и updater. Предыдущий browser smoke был частичным: BNB RPC `Failed to fetch` мешал экранной проверке, транзакции не отправлялись.

## Контракт backend API

Общие заголовки запросов (`src/api/common/backend.ts`): `X-App-ClientID`, `X-App-Version`, `X-App-Env`, `X-App-Name`; в Capacitor, расширении и Electron добавляется `X-App-Origin`, в авторизованных POST — `X-Auth-Token`. `BRILLIANT_API_BASE_URL` и `PROXY_API_BASE_URL` по умолчанию указывают на `https://api.ionwallet.io` (существующий ION backend). `TONCENTER_*_URL` указывает на ION indexer/RPC; `EVM_*_RPC_URL` — на BNB.

### ION Wallet backend (`BRILLIANT_API_BASE_URL`)

| Статус / приоритет | Endpoint | Где в клиенте | Что отдаёт / зачем |
| --- | --- | --- | --- |
| [x] P0 | `GET /assets?langCode=` | `api/common/tokens.ts` | Готово в ION backend: три токена закреплены в коде (ION, BNB, ION в BNB), цены и изменение за 24 ч из CoinGecko раз в 2 минуты; до первой загрузки запрос ждёт цены. `langCode` игнорируется. |
| [x] P0 | `GET /currency-rates` | `methods/polling.ts` | Готово в ION backend: `{ rates }` — единиц USD, EUR, RUB, CNY, BTC и ION (ключ `TON`) за 1 USD. Фиат и BTC из CoinGecko `exchange_rates` раз в 10 минут, ION — `1 / priceUsd` из `/assets`. До первой загрузки запрос ждёт данные. |
| [x] P0 | `GET /utils/get-config` | `methods/polling.ts` | Готово в ION backend: `isLimited: false`, `now` (серверное время), `isUpdateRequired: false`, `isCopyStorageEnabled: false`. |
| [x] P0 | `GET /known-addresses` | `api/common/addresses.ts` | Готово в ION backend: `knownAddresses` из [catchain/ion-address-book](https://github.com/catchain/ion-address-book) раз в час, `scamMarkers`, `trustedSites` (домены `ice.io`), `trustedCollections` (пусто). Антифишинг и подписи адресов. |
| [x] P1 | `GET /staking/common` | `chains/ton/staking.ts` | Готово в ION backend: снимок ION-пула (`currentRate`, `nextRoundRate`, `apy`, `available`, `tvl`, `totalStakers`, `collection`), `round`/`prevRound` из реальных валидационных циклов, `jettonPools: []`. |
| [x] P1 | `GET /staking/state/{address}` | `chains/ton/staking.ts` | Готово в ION backend: `stakedAt` (последний депозит) и `liquid.unstakeRequestAmount` из payout-NFT. Баланс стейка клиент считает сам. |
| [ ] | `GET /prices/chart/{assetId}` | `methods/prices.ts` | Пока не делаем: графики цены пустые. |
| [x] P1 | `POST /notifications/subscribe`, `POST /notifications/unsubscribe` | `methods/notifications.ts` | Готово в ION backend: подписки сохраняются в `notification_subscription`. Сами пуши не отправляются, пока нет ION Firebase и приложений в сторах. |
| [x] P2 | `GET /dns/getDomains?address=` | `chains/ton/domains.ts` | Готово в ION backend: домены `.ion` владельца из ION DNS API; на infra `DNS_API_URL` указывает на внутренний `ion-dns-backend`. GET и CORS preflight с `https://ionwallet.local` проверены. |
| [x] P2 | `GET /v2/dapp/catalog?isLandscape=&langCode=` | `methods/exploreSites.ts` | Готово в ION backend, каталог пока пустой; без сайтов вкладка Explore скрыта. |
| [ ] | WebSocket `/{testnet/}ws` | `api/common/backendSocket.ts` | Пока не делаем, выключен через `NO_WEBSOCKET`. |

Стейкинг: поддерживаются только `liquid` и `jetton`, nominator staking удалён. История начислений, «Всего заработано» и программа лояльности удалены из кошелька.

### Загрузка внешних файлов (`PROXY_API_BASE_URL`, тот же ION backend)

| Приоритет | Endpoint | Зачем |
| --- | --- | --- |
| [x] P1 | `GET /download-json?url=` | Внешние NFT/jetton метаданные без CORS; приватные сети, редиректы, размер и тип ответа ограничены. |
| [x] P2 | `GET /download-lottie?url=` | Lottie-анимации. |

### ION indexer и RPC (`TONCENTER_*_URL` = `https://api.mainnet.ice.io`)

Кошелёк ходит в ION напрямую: indexer — `/indexer/v3`, RPC — `/http/v2/jsonRPC`. Всё ниже совместимо, кроме `/pendingActions` и `/pendingTraces` (на стороне ION не включены emulated traces); `emulateTrace` и streaming у ION нет.

| Endpoint v3 | Зачем |
| --- | --- |
| `/actions`, `/pendingActions` | История и ожидающие операции. |
| `/traces`, `/pendingTraces` | Детали операции и отслеживание отправки. |
| `/transactions`, `/messages` | Транзакции и сообщения. |
| `/accountStates`, `/walletStates` | Состояние аккаунтов и кошельков. |
| `/addressBook`, `/metadata` | Человекочитаемые адреса и метаданные. |
| `/jetton/wallets` | Балансы jetton'ов. |
| `/nft/items`, `/nft/transfers` | NFT и их история. |

### BNB Chain (`EVM_*_RPC_URL`)

| Endpoint | Сейчас | Зачем |
| --- | --- | --- |
| `/{chain}/v2` (JSON-RPC) | RPC-нода | Отправка транзакций, газ, nonce. |
| `/v1/wallets/{address}/positions/` | Zerion | Балансы. Клиенту нужен только ION в BNB. |
| `/v1/wallets/{address}/transactions/` | Zerion | История. |
| `/nft/v3/getNFTsForOwner`, `/nft/v3/getNFTMetadata` | Alchemy-совместимый | NFT; можно убрать, если NFT на BNB не нужны. |

Замена Zerion не утверждена. Нужен индексатор с историей токенов; прокси в ION backend позволит сменить провайдера без изменения клиентского контракта.

### Будущее

- ION bridge (Exchange ION ↔ BNB): адрес bridge-контракта, комиссия, статус перевода. Контракт ещё не утверждён.

## Реестр ресурсов для ребрендинга

Таблицы ниже перечисляют конкретные файлы и внешние ресурсы. Их статус детализирует чекбоксы выше; «готово в коде» не означает публикацию или приёмку.

### Внешние URL и сервисы

| Ресурс | Места в репозитории | Статус | До релиза |
| --- | --- | --- | --- |
| Основной сайт, blog, terms, privacy | `src/config.ts`, Android resources, About | privacy опубликована; остальное требует проверки | Политика: `https://ionwallet.io/privacy-policy/`; ссылка добавлена в web/Android. About пока открывает ice.io и GitHub ION Wallet. Blog URL очищены; terms остаётся пустым. Проверить все публичные URL и опубликовать недостающие страницы до релиза. |
| Help Center и anti-scam статьи | config, warnings, Android resources | переходы удалены | Предупреждения сохранены в 12 языках без dangling CTA. Новые статьи требуют утверждения и публикации. |
| Install/download/update | `APP_DOWNLOAD_URLS`, Settings, UpdateAvailable, UpdateApp | [ ] каналы публикации | Явные optional URL по платформам; обязательное обновление блокирует приложение даже без download URL. |
| Runtime API, RPC, indexer, static CDN, ION Gateway bridge | `src/config.ts`, `webpack.config.ts`, `src/api/chains/ton/toncenter/other.ts`, `src/api/chains/ton/util/tonCore.ts` | готово в коде частично / требует проверки остальных сервисов | Клиент использует ION indexer `/indexer/v3` и RPC `/http/v2/jsonRPC` на `api.mainnet.ice.io`. Wallet backend развёрнут на `api.ionwallet.io`: DNS, TLS, основные ответы и CORS проверены. CDN — `static.wallet.ice.io`; отдельно проверить его и BNB RPC/indexer. Bridge на `https://bridge.ionwallet.io/bridge/`: DNS, TLS и обмен сообщением через SSE проверены. |
| Universal Links / App Links | `mobile/ios/App/Entitlements/IONWallet*.entitlements`, `mobile/android/app/src/ionwallet/AndroidManifest.xml` | HTTPS fallback работает / ассоциация требует регистрации | В мобильных декларациях остался только `connect.ionwallet.io`; старые хосты исключены. `apple-app-site-association` и `assetlinks.json` пока 404. После одобрения Apple Developer Program и Google Play, получения Team ID и Play signing SHA-256 опубликовать файлы без редиректов и проверить ссылки на устройствах. |
| Firebase | Android `google-services.json`, iOS `GoogleService-Info.plist` | требует регистрации | Добавить Android `io.ionwallet` и iOS bundle IDs в ION Firebase Console, включить нужные сервисы и заменить текущие безопасные заглушки. `ANDROID_FIREBASE_APP_ID` указать для нового приложения. |
| ION Gateway registry | manifest / metadata кошелька и реестр ION Gateway | черновой PR #4 | Проверить и опубликовать wallet entry: название, `ion://`/`ion-gateway://`, сайт, иконки, ссылки на store и технический контакт. `tc://` относится к TON Connect и в ION Wallet не принимается; проверить подключение dApp после публикации. |
| WalletConnect Explorer/registry | `WALLET_CONNECT_PROJECT_ID`, `src/api/dappProtocols/adapters/walletConnect/index.ts` | требует регистрации / настройки сборки | По умолчанию project ID пуст; адаптер проверяет его перед запуском. Получить production project ID, передать его в сборку и подтвердить metadata, package ID, redirect/deep links, иконки и privacy URL. Само наличие адаптера не подтверждает работающее подключение. |
| App Store Connect | iOS target, signing, App Store listing | заявка на Apple Developer Program подана | После одобрения зарегистрировать `io.ionwallet` в новой Apple-команде, задать `APPLE_TEAM_ID`, App Store Connect key/issuer и профиль этого bundle ID; затем настроить privacy labels, возрастной рейтинг, support/privacy URL, скриншоты, локализации и TestFlight. Старые Team ID и API key IDs не используются как defaults. |
| Google Play Console | Android flavor `ionwallet`, signing, listing | приложение `io.ionwallet` создано 29.10; policy, доступ, аудитория и IARC сохранены | Карточка со скриншотами готова к отправке на проверку, Data safety в черновике. До отправки разрешить вопрос с требованием Organization-аккаунта для криптокошелька и возрастными группами, затем подготовить подписанный AAB, завершить Data safety и проверить требования к закрытому тесту. Задать signing/Firebase credentials для мобильного CI; Play signing SHA-256 использовать в `assetlinks.json`. |
| Desktop signing and update feed | `src/electron/config.yml`, `.github/workflows/package-and-publish.yml`, `public/icon-electron-*` | готово в коде частично / требует релизной проверки | Иконки заменены. Базовый feed — `/public/desktop`, artifact — `IONWallet-${arch}.${ext}`; staging workflow при пустом `PUBLISH_REPO` переключает feed на `/desktop-beta` и mac artifact на имя с версией. Подтвердить каналы, secrets, signing/notarization и реальное обновление. `extraMetadata.productName: IONWallet` сохранять: значение связано с userData/keychain. |
| README и публичная документация | `README.md`, `docs/` | готово в коде / требует развития | README очищен от неподтверждённых заявлений старого продукта; перед публикацией добавить подтверждённые ссылки на сайт, stores, help, policy и инструкции поддержки. |

`app_cards_url` и `app_giveaway_url` уже удалены из актуального Android `strings.xml`. Их не возвращать: Cards и Giveaway относятся к удаляемым функциям.

### Визуальные и брендовые ресурсы

Генератор `dev/branding/generate.mjs` экспортирует ION SVG/PNG/WebP/ICO/ICNS и ресурсы платформ; `dev/branding/illustrations.mjs` — анимации и превью. Команды: `npm run build:branding`, `npm run check:branding`. Геометрия знака берётся из существующего `src/assets/blockchain/chain_ton.svg`; название этого файла не означает, что внутри старый TON-логотип. Утверждение брендом и проверка на устройствах остаются отдельными шагами.

| Набор | Исходные файлы | Статус | Действие |
| --- | --- | --- | --- |
| Web/PWA logo и favicon | `public/logo.svg`, `public/icon.png`, `public/icon-*.png`, `public/apple-touch-icon.png`, `public/favicon.ico`, `public/mstile-150x150.png` | готово в коде | Экспортированы ION-версии; manifest ссылается на существующие 192/384/512 PNG и использует цвет `#11073C`. Остаются утверждение и проверка установки PWA, favicon и системных поверхностей. |
| Web-интерфейс и dApp icon | `src/assets/logo*`, `public/assets/ui/qr-logo.png`, `src/util/injectedConnector/injectedIcon.ts` | готово в коде | Основные варианты и embedded icon заменены на ION. Проверить оставшиеся экраны, темы и QR на разных размерах; публичный `APP_ICON_URL` требует размещения файла на сайте. |
| Electron | `public/icon-electron-macos.icns`, `public/icon-electron-macos.png`, `public/icon-electron-windows.ico`, `public/icon-256x256.png` | готово в коде | ION ICO/ICNS/PNG экспортированы, недостающий 256px ресурс добавлен. Проверить dock/taskbar, установщик и готовый пакет на каждой ОС. |
| Android launcher, splash, notification | `mobile/android/app/src/ionwallet/res/mipmap-*`, `drawable-*/ic_default_notification.png`, `ic_splash_foreground.webp`, `img_logo_src.webp` | готово в коде | ION-версии экспортированы по плотностям, notification — белый знак на прозрачном фоне. Остаются native-device проверки adaptive mask, splash и уведомлений. |
| iOS app icon и intro | `mobile/ios/App/App/Resources/IONWallet/AppIcon.icon`, `Assets.xcassets/AppIcon.appiconset`, `Assets.xcassets/IntroLogo.imageset` | готово в коде | Icon Composer использует ION SVG, app icon — 1024×1024 без alpha, intro заменён. Проверить Xcode export, iPhone/iPad и App Store Connect. |
| Нативные копии web assets | `mobile/android/app/src/main/assets/public`, `mobile/ios/App/App/public` | производные файлы | Не редактировать вручную: обновлять `public/`, затем проверять результат `cap sync`. |
| TON-партнёрские marks | бывшие `public/logo-ton-app.svg`, `public/logo-ton-org.svg` | удалено | Файлы отсутствуют; возвращать их без нового продуктового решения не требуется. |
| Фоны обычных карточек аккаунта | `src/assets/cards/**`, `src/assets/account_button_bg*` | готово в коде частично | Основные карточки и account backgrounds заменены на ION; каталог используется действующим UI и целиком не удаляется. `settings_mw-cards.svg` отсутствует. Оставшиеся специальные фоны/скелетоны требуют отдельного визуального просмотра. |
| Анимации и превью | `src/assets/lottie/ion_*.tgs`, `src/assets/lottiePreview/ion_*.png`, `src/components/ui/helpers/animatedAssets.ts` | готово в коде | 13 ION-анимаций и соответствующие превью, `duck_*` файлов нет. Проверка RLottie пройдена. Остальные нейтральные анимации не были автоматически заменены. |
| Onboarding и эффекты | `src/components/auth/**`, `src/util/createIonParticleTexture.ts`, `src/assets/settings/settings_biometrics.svg`, `settings_face-id.svg` | готово в коде | Отсчёт/искусственная задержка создания убраны, экраны защиты используют ION-частицы и обновлённые иконки. Финальный просмотр всех переходов и размеров остаётся. |
| Темы, blockchain icons и остальные иллюстрации | `src/assets/theme/**`, `src/assets/blockchain/**`, прочие `lottie*` | требует проверки | Для blockchain сохранены ION-знак в `chain_ton.svg` и BNB. Остальные нейтральные/специальные ресурсы проверить по реальному месту использования; файловый поиск не заменяет визуальный аудит. |

## Технический реестр контрактов и runtime-идентификаторов

Проверка 22.10.2026: только GET/read-only JSON-RPC, без транзакций, deploy и подписей. Адреса и операции сохранены. Существование аккаунта, интерфейс и имя токена сами по себе не подтверждают официальное назначение. ION использует внутренний chain ID `ton`.

| Значение | Сеть / класс | Назначение, места использования | Источник подтверждения и результат read-only проверки |
| --- | --- | --- | --- |
| `LIQUID_POOL = EQAYI9vwZ3K5y9n_9-E8F_e3JzMzNNyEib0ddBlfAWOOsh_c` | ION mainnet production default; env override `LIQUID_POOL` | Liquid stake destination/state; `src/config.ts`, `src/api/chains/ton/staking.ts`, `toncenter/actions.ts`, `ALL_STAKING_POOLS` | **Назначение подтверждено** официальным [staking bundle](https://stake.ice.io/assets/index-1df23664.js), константа `POOL_ADDRESS`. ION `/indexer/v3/accountStates?address=...`: active, `ionstake_pool`, code hash `K75frMqVhyVpqyDgGdTSvKF4rHBdgRE/ImFELu+9E54=`. Testnet и overrides не подтверждены. |
| `LIQUID_JETTON = EQACbwI38RnvclU5Wv6H9zDr8Ao_tq9NWilXxBmoE8yroZlF` | ION mainnet default; env override `LIQUID_JETTON` | Liquid asset, unstake token wallet; `staking.ts`, `util/metadata.ts`, `src/config.ts` | **Назначение подтверждено** тем же официальным bundle, `JETTON_MASTER_ADDRESS`. `/indexer/v3/jetton/masters?address=...`: active jetton master, admin соответствует pool, metadata LION; code hash `pGh4ZFUmXoM8Cep2WYHVKvzWegCDjboxt3AJsWzwhlo=`. Имя LION не было основанием подтверждения. Testnet/overrides не проверены. |
| `STAKED_TON_SLUG = ton-EQACbwI38RnvclU5Wv6H9zDr8Ao_tq9NWilXxBmoE8yroZlF` | Производный от effective jetton | Token lookup/styles, `STAKED_TOKEN_SLUGS`; `src/config.ts`, `staking.ts`, selectors | **Локально подтверждено**: `ton-${LIQUID_JETTON}` совпадает с `buildTokenSlug`. Slug не отдельный контракт. При env override значение меняется. |
| `ION_BNB_MAINNET = 0xE1ab61f7b093435204dF32F5b3A405de55445Ea8`, slug `bnb-0xE1ab61f7b093435204dF32F5b3A405de55445Ea8` | BNB mainnet default, без override | Default/kept assets: `src/config.ts`, `src/util/chain.ts`, `src/api/chains/evm/wallet.ts` | **Issuer/bridge ION не подтверждены владельцем в этой сверке.** `eth_getCode(address,latest)` через `https://bsc-rpc.publicnode.com` вернул код (17 724 hex-символа с `0x`). Binance RPC/BSCScan — timeout. Код и имя не доказывают происхождение; нужен официальный deployment record для chain 56. |
| `TON_DNS_ZONES[0].resolver = EQD-T0TFfemKkgq2GCuKfsuCJhs56wVDfqXSCi65TrzZFb5E`, suffix `ion` | Config default, применяется к mainnet/testnet | DNS resolve/renew/link и NFT metadata; `src/config.ts`, `src/util/dns.ts`, `src/api/chains/ton/domains.ts`, `util/metadata.ts` | **Назначение ION требует подтверждения владельца.** Mainnet API: active, `dns`/`nft_collection`, code hash `qKrrA+3IU9O/cnfYRCXVjCv7aIw7Ecx2iP9COiBS8l8=`. Data содержит `https://dns.ice.io/meta/collection.json`; GET metadata — timeout. Интерфейс/URI не доказывают официальную зону. Testnet не проверен. |
| `feeCheckAddress = UQBE5NzPPnfb6KAy7Rba2yQiuUnihrfcFw96T-p5JtZjAl_c` | ION config default, без override | `src/util/chain.ts`: адрес оценки комиссии по описанию; активных consumers поля в `src` нет | **Локально валиден**, raw `0:44e4dccf3e77dbe8a032ed16dadb2422b949e286b7dc170f7a4fea7926d66302`. Mainnet API: accounts=[]; это не доказательство отсутствия аккаунта вне indexer. Не подтверждённый контракт/получатель. |
| BNB `feeCheckAddress = 0x0000000000000000000000000000000000000000` | BNB config default | То же поле, активных consumers нет | **Локально валиден**, нулевой 20-byte адрес. Не deployment и не подтверждённый получатель. |
| `BURN_ADDRESS = UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ` | ION default, mainnet/testnet | NFT burn destination: `src/api/chains/ton/nfts.ts`; detection `toncenter/actions.ts`; emulation placeholder `emulation.ts` | **Локально подтверждён** checksum и raw `0:` + 64 нуля. Mainnet API: uninit, code_hash=null. Sentinel, не deployed contract; необратимость на уровне протокола ION и testnet требуют отдельного подтверждения. |
| `PushEscrow.ts`, `PushEscrowV3.ts`, `PushEscrowJwt.ts` | Библиотечные wrappers; сеть не зафиксирована | `src/api/chains/ton/contracts/`; createFromAddress и производный `contractAddress(workchain,{code,data})`. Config sudoer; V3 добавляет instanceId; Jwt — pubkeyHashes | **Runtime импортов и configured deployment в src не найдено.** Фиксированного адреса/кода для сетевого запроса нет; ION deployment не подтверждён. Wrappers сохранены. |

### FIVA/Affluent: runtime code hashes

Production defaults `PRICELESS_TOKEN_HASHES` в `src/config.ts`, без env override. Все десять значений локально проверены как 64 hex-символа. Это code hashes, а не адреса получателей; `src/api/chains/ton/priceless.ts` переводит полученные base64 code_hash в hex для этих фильтров. Используются в token filters `src/global/selectors/tokens.ts` и `src/util/tokens.ts`. Ни один не подтверждён владельцем ION. Для каждого проверен mainnet `GET https://api.mainnet.ice.io/indexer/v3/accountStates?address=<адрес из комментария>`. Пустой ответ не доказывает отсутствия всех контрактов с таким кодом в сети. Фильтры и значения не изменены.

| Code hash, hex | Комментарий / адрес запроса | Read-only результат; статус назначения ION |
| --- | --- | --- |
| `173e31eee054cb0c76f77edc7956bed766bf48a1f63bd062d87040dcd3df700f` | FIVA SY tsTON; `EQAxGi9Al7hamLAORroxGkvfap6knGyzI50ThkP3CLPLTtOZ` | HTTP 200, accounts=[]; **не подтверждено**. |
| `5226dd4e6db9af26b24d5ca822bc4053b7e08152f923932abf25030c7e38bb42` | FIVA PT tsTON; `EQAkxIRGXgs2vD2zjt334MBjD3mXg2GsyEZHfzuYX_trQkFL` | HTTP 200, accounts=[]; **не подтверждено**. |
| `fea2c08a704e5192b7f37434927170440d445b87aab865c3ea2a68abe7168204` | FIVA YT tsTON; `EQAcy60qg22RCq87A_qgYK8hooEgjCZ44yxhdnKYdlWIfKXL` | HTTP 200, accounts=[]; **не подтверждено**. |
| `e691cf9081a8aeb22ed4d94829f6626c9d822752e035800b5543c43f83d134b5` | FIVA LP tsTON; `EQD3BjCjxuf8mu5kvxajVbe-Ila1ScZZlAi03oS7lMmAJjM3` | Timeout 5 s; **не подтверждено**. |
| `301ce25925830d713b326824e552e962925c4ff45b1e3ea21fc363a459a49b43` | FIVA SY eUSDT; `EQDi9blCcyT-k8iMpFMYY0t7mHVyiCB50ZsRgyUECJDuGvIl` | HTTP 200, accounts=[]; **не подтверждено**. |
| `02250f83fbb8624d859c2c045ac70ee2b3b959688c3d843aec773be9b36dbfc3` | FIVA PT eUSDT; `EQBzVrYkYPHx8D_HPfQacm1xONa4XSRxl826vHkx_laP2HOe` | HTTP 200, accounts=[]; **не подтверждено**. |
| `dba3adb2c917db80fd71a6a68c1fc9e12976491a8309d5910f9722efc084ce4d` | FIVA YT eUSDT; `EQCwUSc2qrY5rn9BfFBG9ARAHePTUvITDl97UD0zOreWzLru` | HTTP 200, accounts=[]; **не подтверждено**. |
| `7da9223b90984d6a144e71611a8d7c65a6298cad734faed79438dc0f7a8e53d1` | FIVA LP eUSDT; `EQBNlIZxIbQGQ78cXgG3VRcyl8A0kLn_6BM9kabiHHhWC4qY` | HTTP 200, accounts=[]; **не подтверждено**. |
| `eb9d9891a32ec94425c09735f6ade73f4c171da0091f874d6e9d25247d583990` | Affluent TON Lending Vault; `EQADQ6JcK0NMuNM5uwCcS9bjcn2RTvcxYIZjNlhIhywUrfBN` | HTTP 200, accounts=[]; **не подтверждено**. |
| `bca42dbdcbc0d885aaffb1eeeb027d9f338c2dd68701a05641c1d1c3171a7400` | Affluent TON Multiply Vault; `EQDtxQqkgIRQQR5hWlrQxiJMtLwjR3rEYNUBbEcvPDwCs1Ng` | HTTP 200, accounts=[]; **не подтверждено**. |

### Defaults, overrides, производные значения и fixtures

`LIQUID_POOL`/`LIQUID_JETTON` берутся из env с fallback; webpack объявляет пустые defaults. Проверены приведённые mainnet defaults, не произвольные deployment overrides. Mainnet подтверждение не распространяется на testnet. Token wallets для unstake вычисляются через `resolveTokenWalletAddress(network,owner,LIQUID_JETTON)`; PushEscrow addresses — из workchain/code/config. Это производные адреса.

Legacy TON адреса в `tests/mocks/tokens.ts`, unit fixtures, URL-тестах и protocol comments отделены от production defaults. FIVA/Affluent набор реально участвует в runtime filters. Read-only проверка не является аудитом безопасности, доходности или проверкой stake/unstake транзакций.

## Как поддерживать план

После каждого завершённого блока обновлять соответствующий чекбокс, указывать коммит или PR и короткий результат проверки. Для пунктов, затрагивающих деньги, подпись, сеть или публикацию, отдельно отмечать проверку на устройстве/production endpoint. Исторические тесты и открытый PR не считаются подтверждением готовности релиза.
