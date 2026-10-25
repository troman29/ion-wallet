# Реестр ресурсов для ребрендинга ION Wallet

Этот файл — источник правды для внешних ресурсов, которые нельзя считать готовыми только потому, что в коде уже стоит `wallet.ice.io` или `ION Wallet`.

## Текущее состояние

Состояние сверено с текущим деревом master на базе `4c6a70954` (22.10.2026). Результаты read-only проверки URL/контрактов P1 приведены ниже. Кабинеты магазинов, сертификаты и association-файлы не проверялись.

Основной набор графики заменён на ION. Остаются утверждение графики, проверка остальных экранов и платформ, а также внешняя инфраструктура.

Статусы:

- **требует решения** — владелец продукта должен дать конечное значение или подтвердить удаление;
- **требует регистрации** — ресурс создаётся во внешней системе;
- **требует дизайна и проверки** — файл существует, но его визуальная принадлежность ION не подтверждена;
- **удаляется** — остаток закрытого продукта;
- **готово в коде** — кодовая привязка сделана, но внешняя публикация может ещё отсутствовать.
- **удалено** — отсутствие файлов и ссылок подтверждено в текущем дереве;
- **производные файлы** — результат сборки/копирования исходных ресурсов.

## Внешние URL и сервисы

| Ресурс | Места в репозитории | Статус | До релиза |
| --- | --- | --- | --- |
| Основной сайт, blog, terms, privacy | `src/config.ts`, Android resources, About | публикация отдельно | About открывает ice.io и GitHub ION Wallet. Blog URL очищены. Terms/privacy и onboarding consent сохранены; страницы публикуются отдельно. |
| Help Center и anti-scam статьи | config, warnings, Android resources | переходы удалены | Предупреждения сохранены в 12 языках без dangling CTA. Новые статьи требуют утверждения и публикации. |
| Install/download/update | `APP_DOWNLOAD_URLS`, Settings, UpdateAvailable, UpdateApp | скрыто до публикации каналов | Явные optional URL по платформам; обязательное обновление блокирует приложение даже без download URL. См. P1 ниже. |
| Runtime API, RPC, indexer, static CDN, ION Gateway bridge | `src/config.ts`, `webpack.config.ts`, `src/api/chains/ton/toncenter/other.ts`, `src/api/chains/ton/util/tonCore.ts` | готово в коде частично / требует проверки сервиса | Клиент уже использует ION indexer `/indexer/v3` и RPC `/http/v2/jsonRPC` на `api.mainnet.ice.io`; отсутствие v3 indexer больше не является открытым пунктом. Backend по умолчанию — `api.wallet.ice.io`, CDN — `static.wallet.ice.io`. Подтвердить deployment, доступность и контракт каждого сервиса, отдельно BNB RPC/indexer. Bridge на `https://bridge.ionwallet.io/bridge/`: DNS, TLS и обмен сообщением через SSE проверены. |
| Universal Links / App Links | `mobile/ios/App/Entitlements/IONWallet*.entitlements`, `mobile/android/app/src/ionwallet/AndroidManifest.xml` | HTTPS fallback работает / ассоциация требует регистрации | `connect.ionwallet.io` отдаёт `/` и `/wc`; `apple-app-site-association` и `assetlinks.json` пока 404. Опубликовать файлы без редиректов после получения нового Apple Team ID и Google Play signing SHA-256 для `io.ionwallet`; проверить открытие ссылок на устройствах. Legacy-хосты `wallet.ice.io` и `go.wallet.ice.io` разобрать отдельно. |
| Firebase | Android `google-services.json`, iOS `GoogleService-Info.plist` | требует регистрации | Добавить Android `io.ionwallet` и iOS bundle IDs в ION Firebase Console, включить нужные сервисы и заменить текущие безопасные заглушки. `ANDROID_FIREBASE_APP_ID` указать для нового приложения. |
| ION Gateway registry | manifest / metadata кошелька и реестр ION Gateway | требует регистрации | Создать официальный wallet entry: название, `ion://`/`ion-gateway://`, сайт, иконки, ссылки на store и технический контакт. Подтвердить регистрацию и совместимость со стандартным входящим URI ION Gateway `tc://`; проверить подключение dApp после публикации. |
| WalletConnect Explorer/registry | `WALLET_CONNECT_PROJECT_ID`, `src/api/dappProtocols/adapters/walletConnect/index.ts` | требует регистрации / настройки сборки | По умолчанию project ID пуст; адаптер проверяет его перед запуском. Получить production project ID, передать его в сборку и подтвердить metadata, package ID, redirect/deep links, иконки и privacy URL. Само наличие адаптера не подтверждает работающее подключение. |
| App Store Connect | iOS target, signing, App Store listing | требует регистрации | Зарегистрировать `io.ionwallet` в новой Apple-команде, задать `APPLE_TEAM_ID`, App Store Connect key/issuer и профиль этого bundle ID; затем настроить privacy labels, возрастной рейтинг, support/privacy URL, скриншоты, локализации и TestFlight. Старые Team ID и API key IDs не используются как defaults. |
| Google Play Console | Android flavor `ionwallet`, signing, listing | требует регистрации | Создать приложение, загрузить подписанный AAB, настроить Play App Signing, Data safety, content rating, privacy policy, контакты, скриншоты и closed testing. |
| Desktop signing and update feed | `src/electron/config.yml`, `.github/workflows/package-and-publish.yml`, `public/icon-electron-*` | готово в коде частично / требует релизной проверки | Иконки заменены. Базовый feed — `/public/desktop`, artifact — `IONWallet-${arch}.${ext}`; staging workflow при пустом `PUBLISH_REPO` переключает feed на `/desktop-beta` и mac artifact на имя с версией. Подтвердить каналы, secrets, signing/notarization и реальное обновление. `extraMetadata.productName: IONWallet` сохранять: значение связано с userData/keychain. |
| README и публичная документация | `README.md`, `docs/` | готово в коде / требует развития | README очищен от неподтверждённых заявлений старого продукта; перед публикацией добавить подтверждённые ссылки на сайт, stores, help, policy и инструкции поддержки. |

`app_cards_url` и `app_giveaway_url` уже удалены из актуального Android `strings.xml`. Их не возвращать: Cards и Giveaway относятся к удаляемым функциям.

## Визуальные и брендовые ресурсы

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

## Оставшиеся задачи в коде

1. **Контрактные подтверждения.** URL-часть P1 выполнена; оставшиеся неподтверждённые deployments перечислены ниже.
2. **Публикация каналов.** Нужны подтверждённые help/download/store URL и updater feeds. До публикации соответствующие CTA скрыты. Legal публикуется отдельно. `gcm_sender_id: 122867383838` в manifest требует проверки при настройке push.
3. **Протоколы dApp.** Публичное имя ION Gateway уже используется, но реальная реализация — адаптер TON Connect, extension alias `ionconnect`/`tonconnect`, embedded bridge и SSE URL. Проверить end-to-end и согласовать протокол/registry до удаления совместимых alias.
4. **Технические имена.** Новые cache names — `ion-image`, `ion-lang-1`; ION globals/env и active-tab marker введены. Старые `mtw-active-tab`, `__mtwStorageGlobals`, `MTW_*` оставлены как alias совместимости. В Android assets ещё есть `assets/js/index.html` со ссылкой на `mytonwallet-sdk.js`; проверить эту SDK-цепочку отдельно. Закреплённые dependency forks не переименовывать без готовой замены.
5. **Оставшиеся строки.** Legacy-названия встречаются в ключах локализаций, хотя значения уже содержат ION Wallet. Проверять отображаемые значения и достижимые экраны, а не считать каждое совпадение старым брендом в UI. Удалённый Telegram support не заменён новым каналом без решения продукта.

## Что проверено в этой сверке

- `npm run check:branding` — успешно: 13 анимаций, по 60 кадров, кадр 30 отрисован штатным RLottie; контактный лист просмотрен.
- iOS PNG — 1024×1024 без alpha; выборочно проверены размеры web/PWA/Android PNG/WebP, все три icon path из manifest существуют.
- Подтверждены отсутствие TON-партнёрских SVG, `duck_*`, `settings_mw-cards.svg` и удалённого `tonConnectFriendlyPatch.js`.
- Текущее дерево: `npm run check` — успешно; Jest — 1004 passed / 120 suites; `npm run check:branding` — 13 анимаций и iOS icon; генерация default и Android локализаций — успешно; production webpack — успешно, 2 предупреждения о размере bundle. Native/device проверки и реальные транзакции не выполнялись.

## Приоритет оставшейся работы

- **До рабочего продукта:** подтверждение оставшихся контрактов; проверка ION/BNB backend и dApp-подключений. Интеграцию BSC indexer согласовать с ведущимся backend-блоком.
- **До публикации:** legal/help/download, Firebase/push, domain associations, project IDs/registries, signing/update feeds, store listing и screenshots.
- **Финальная приёмка:** утверждение графики, web/extension/Electron и Android/iOS на устройствах, QR/deep links, создание/импорт/receive/send/staking. Exchange пока оболочка — bridge требует отдельного согласованного контракта и реализации.

## Повторяемая проверка

Перед каждым релизом:

1. Просмотреть все строки `wallet.ice.io` и каждый URL в пользовательском интерфейсе; для каждого должно быть опубликованное назначение и владелец.
2. Открыть приложение на web, Android, iOS, extension и Electron и проверить logo, icon, splash, QR, deep links и внешние переходы.
3. Выполнить поиск `mytonwallet`, `my wallet`, `gram`, `mtw`, `giveaway` и список отключённых продуктов. Совпадения в закреплённых зависимостях и тестовых данных оформлять отдельно с обоснованием.
4. Сверить store/registry metadata с package IDs: `io.ionwallet`, iOS IONWallet targets, `ion://`, `ion-gateway://`, `ion-wc://` и стандартным URI ION Gateway `tc://`.

## P1: внешние переходы — 22.10.2026

Назначение [ION Explorer](https://explorer.ice.io/) подтверждено [официальной страницей staking](https://ice.io/staking). Публичный bundle `/application.d4056359.js` содержит маршруты `address/:address`, `jetton/:address`, `transaction/:hash`, `nft/:address`, `collection/:address`; они используются в `src/util/chain.ts`. Hash переводится из base64 в hex; готовый hex сохраняется. Старые explorer ID в settings используют fallback без миграции кошельков. Testnet explorer не подтверждён: переходы скрыты, mainnet fallback не применяется. Выбранный ID передаётся и в template, и в base URL.

ION marketplace не настроен. Getgems и глобальный выбор OpenSea по multichain-признаку удалены. NFT, коллекции и описания остаются без кнопки покупки; BNB BSCScan/OpenSea routes сохранены. BNB testnet marketplace и collection route отсутствуют. JVault link/атрибуция и неподтверждённое утверждение об аудите token staking удалены; операции не изменены. Legacy `toncoin` не открывает CoinMarketCap TON. Из UI выбора субкошелька удалён переход на TON documentation.

Explorer открывается внешне, включая Capacitor; TON origins удалены из iframe whitelist, новый origin туда не добавлен. Help/anti-scam links удалены, предупреждения во всех 12 локализациях сохранены без dangling «узнать больше». Неизвестный dApp source предлагает проверить адрес сайта вместо установки по неподтверждённым ссылкам.

`APP_DOWNLOAD_URLS` задаёт необязательные URL явно по каналам: landing, desktop, mobile, Android direct, Play, iOS, Chrome, Edge, Firefox. Сейчас карта пуста: install предложения в Settings, security warning и legacy banners скрыты. Legacy banner оставляет имя домена обычным текстом. Electron manual update больше не открывает `/get`; конкатенации download URL удалены. Обязательное обновление блокирует всё приложение, включая auth и Electron, даже без download URL. Electron сохраняет updater и оконные кнопки в AppShell: скачанное штатное обновление устанавливается прямо с обязательного экрана, в том числе после события загрузки во время блокировки. При включённом автообновлении доступный новый web-интерфейс Electron загружается перезагрузкой, даже при ошибке нативного updater; скачанный установщик имеет приоритет. При выключенном автообновлении перезагрузка локального bundle не предлагается. При отсутствии рабочего канала показывается сообщение о его недоступности. Web предлагает перезагрузку.

Неподтверждённые Android blog/install/help/scam/APK resources удалены (активных native consumers не найдено). Terms/privacy, onboarding consent, package IDs и association-конфигурация сохранены. Blog map очищен; helper возвращает undefined.

Workflow/config audit: production updater feed `https://s3.wallet.ice.io/public/desktop`, staging `https://s3.wallet.ice.io/public/desktop-beta`, desktop artifact `IONWallet-${arch}.${ext}`, mac staging `IONWallet-${version}-${arch}.${ext}`. Это настройки публикации, не подтверждение готового канала; signing, feeds и stores требуют release smoke test. TON-сервисы остались в protocol comments и fixtures; OpenSea runtime URL относится только к BNB. Dependencies и bridge identifiers не менялись.

Read-only доступность из этой среды: `wallet.ice.io` — DNS не вернул адрес; help, DNS metadata и desktop feed — timeout. Это не доказательство глобальной недоступности. Эти результаты не использованы как подтверждение каналов.

## Реестр контрактов и runtime-идентификаторов

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

## Проверки P1

`npm run check`, Jest (1004 tests / 120 suites), `npm run i18n:build:default`, `npm run i18n:build:android`, `npm run check:branding` и production webpack проходят. У webpack остаются 2 предупреждения о размере bundle. URL-тесты покрывают все ION routes, base64/hex hash, legacy IDs, отсутствие testnet/marketplace, выбор base URL по ID и сохранение BNB routes. UI-тесты проверяют отсутствие NFT buy CTA/пустых ссылок, все 12 переводов и обязательный update screen без URL и возможности отменить блокировку. Отдельно проверены установка Electron-обновления, скачанного до/после блокировки, ошибка updater, отсутствие канала, ручной подтверждённый URL и сохранение оконных кнопок. Интеграционный тест меню адреса проверяет встроенное открытие BNB на Capacitor и внешнее открытие ION.

Проверка исправления Electron: 11 тестов AppShell/UpdateAvailable проходят, включая перезагрузку доступного web-интерфейса до/после блокировки, ошибку нативного updater, запрет перезагрузки локального bundle и приоритет скачанного установщика. В полном Jest-прогоне прошёл 1001 тест; три теста файлового хранилища получили EPERM на rename в системной TEMP-папке песочницы и успешно прошли повторно с TEMP/TMP внутри проекта. `npm run check` проходит.

Браузерная проверка частичная: проверены пустое NFT-состояние, отсутствие install/help-предложений в Settings и исчезновение install security banner; backup warning сохранён. На публичном ION pool в режиме просмотра загрузились баланс и история, открыт receive с ION-адресом, explorer-кнопкой и предупреждением «это НЕ ваш кошелёк». Пустое NFT-состояние не содержит purchase CTA. Подробности истории открыты с explorer-действиями. Коллекции с данными, staking descriptions и scam conditions требуют дополнительного браузерного прохода: повторяющийся BNB RPC Failed to fetch перекрывает интерфейс dev-уведомлениями. Это не отмечено как успешный end-to-end тест. Транзакции и подписи не выполнялись.

Android-проверка 23.10.2026: отдельный worktree от `d8f41f205`, production Capacitor web-бандл, синхронизация Android и `assembleIonwalletProdDebug` — успешно. APK `io.ice.wallet.debug` / `1.0.debug` (28 816 608 байт), minSdk 24, targetSdk 37; подпись APK v2 проверена. SHA-256: `fa386963c0be099f4d7671f91c7c2b888133e980b50e0f155a585dc607b43d9b`. Firebase-конфигурация остаётся заглушкой. Запуск на эмуляторе Google APIs x86_64 API 37 проверен: onboarding, установка/подтверждение PIN и переход к резервной копии; секретные слова не открывались. В WebView есть Failed to fetch, проверка backend/синхронизации остаётся открытой. Физическое устройство и release signing не проверены. После Capacitor sync восстановлен исходный путь `:capacitor-dialog` к `mobile/plugins/native-dialog/android`.

Продолжение Android-проверки 23.10.2026: Android lint и debug-сборка проходят после точечных правок манифестов (явный exported для MainActivity во flavor; MissingClass подавлен только для tools:node=remove маркера необязательной Google scanner activity). Локальный SDK path записан с экранированным двоеточием. Instrumentation-тест AppContextTest перенесён в io.ice.wallet и проверяет допустимые ION package IDs; на эмуляторе 1 passed. Единственный локальный unit-тест остаётся шаблонным 2 + 2 и не подтверждает работоспособность кошелька. Обновлённый APK: `IONWallet-android-smoke-debug.apk`, 28816608 байт, SHA-256 `fa386963c0be099f4d7671f91c7c2b888133e980b50e0f155a585dc607b43d9b`. Транзакции не отправлялись.

При BIP39 discovery ожидание BNB balance RPC ограничено 10 секундами; при зависшем RPC используется уже предусмотренный offline fallback на default EVM derivation. TON derivation/неоднозначные мнемоники, контракты и форматы не изменены. Отдельный `EVM_MAINNET_RPC_URL` по умолчанию указывает на `evmapi.wallet.ice.io`, который в этой проверке не разрешается; `https://ion.windbit.dev/bnb/v2` возвращает 404. BNB RPC/indexer остаётся внешней задачей. CORS для `/dns/getDomains` на backend требует разрешить `X-App-Origin` от `https://ionwallet.local` либо согласовать изменение заголовка клиента.
