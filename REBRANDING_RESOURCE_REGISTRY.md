# Реестр ресурсов для ребрендинга ION Wallet

Этот файл — источник правды для внешних ресурсов, которые нельзя считать готовыми только потому, что в коде уже стоит `wallet.ice.io` или `ION Wallet`.

## Текущее состояние

Состояние сверено с актуальным `master` (`3e2675ddf`, PR #28). Внешние сервисы, кабинеты магазинов, сертификаты и опубликованные association-файлы не проверены. «Требует регистрации» означает, что в репозитории нет подтверждения готовой интеграции; фактическое состояние кабинета нужно уточнить у владельца.

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
| Основной сайт, blog, terms, privacy | Android `strings.xml`, `src/config.ts`, `src/components/settings/SettingsAbout.tsx` | частично готово в коде / требует решения | About уже ссылается на `ice.io` и репозиторий ION Wallet; ссылка на блог из About убрана. URL legal-страниц и старые blog-маршруты остаются в конфигурации/Android resources. Подтвердить каждое назначение, опубликовать нужные страницы или убрать используемые ссылки. |
| Help Center и anti-scam статьи | `HELP_CENTER_URL` в `src/config.ts`, `ScamWalletWarning.tsx`, `TransferInitial.tsx`, Android `strings.xml` | частично очищено / требует решения | Пункт Help Center убран из Settings, но предупреждения о мошенничестве всё ещё открывают `help.wallet.ice.io`; domain-scam пути содержат `.ton`. Нужны утверждённые ION EN/RU статьи или изменение этих переходов. |
| Загрузка Android/desktop и `IONWallet.apk` | Android `strings.xml`, Electron/webpack URL | требует решения | Настроить подписанные артефакты, загрузку, обновления и проверить ссылки с чистого устройства. |
| Runtime API, RPC, indexer, static CDN, ION Gateway bridge | `src/config.ts`, `webpack.config.ts`, `src/api/chains/ton/toncenter/other.ts`, `src/api/chains/ton/util/tonCore.ts` | готово в коде частично / требует проверки сервиса | Клиент уже использует ION indexer `/indexer/v3` и RPC `/http/v2/jsonRPC` на `api.mainnet.ice.io`; отсутствие v3 indexer больше не является открытым пунктом. Backend по умолчанию — `api.wallet.ice.io`, CDN — `static.wallet.ice.io`. Подтвердить deployment, доступность и контракт каждого сервиса, отдельно BNB RPC/indexer. Bridge пока `https://tonconnectbridge.wallet.ice.io/bridge/`; новый адрес вводить после подготовки сервиса и интеграционной проверки. |
| Universal Links / App Links | `mobile/ios/App/Entitlements/IONWallet*.entitlements`, `mobile/android/app/src/ionwallet/AndroidManifest.xml` | требует регистрации | Опубликовать `apple-app-site-association` и `assetlinks.json` на `wallet.ice.io`, `connect.wallet.ice.io`, `go.wallet.ice.io`; в файлах указать реальные App ID, signing certificate SHA-256 и пути. |
| Firebase | Android `google-services.json`, iOS `GoogleService-Info.plist` | требует регистрации | Создать production-проекты ION в Firebase Console, добавить Android `io.ice.wallet` и iOS bundle IDs, включить нужные сервисы и заменить текущие безопасные заглушки. |
| ION Gateway registry | manifest / metadata кошелька и реестр ION Gateway | требует регистрации | Создать официальный wallet entry: название, `ion://`/`ion-gateway://`, сайт, иконки, ссылки на store и технический контакт. Подтвердить регистрацию и совместимость со стандартным входящим URI ION Gateway `tc://`; проверить подключение dApp после публикации. |
| WalletConnect Explorer/registry | `WALLET_CONNECT_PROJECT_ID`, `src/api/dappProtocols/adapters/walletConnect/index.ts` | требует регистрации / настройки сборки | По умолчанию project ID пуст; адаптер проверяет его перед запуском. Получить production project ID, передать его в сборку и подтвердить metadata, package ID, redirect/deep links, иконки и privacy URL. Само наличие адаптера не подтверждает работающее подключение. |
| App Store Connect | iOS target, signing, App Store listing | требует регистрации | Зарегистрировать приложение и bundle ID, настроить certificates/profiles, privacy labels, возрастной рейтинг, support/privacy URL, скриншоты, локализации и TestFlight. |
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

1. **Внешние переходы сети ION.** В `src/util/chain.ts` для ION пока настроены Tonscan/Tonviewer и Getgems. В NFT UI остаются переходы на Getgems/OpenSea, в staking — JVault (`StakingInitial.tsx`). Подтвердить применимость каждого сервиса к ION, заменить или убрать переход. Простого переименования подписи недостаточно.
2. **Help и публичные URL.** Согласовать legal/help/download URL и убрать неработающие переходы из предупреждений. `public/site.webmanifest` содержит `gcm_sender_id: 122867383838`; подтвердить назначение этого значения до настройки ION push.
3. **Протоколы dApp.** Публичное имя ION Gateway уже используется, но реальная реализация — адаптер TON Connect, extension alias `ionconnect`/`tonconnect`, embedded bridge и SSE URL. Проверить end-to-end и согласовать протокол/registry до удаления совместимых alias.
4. **Технические имена.** Новые cache names — `ion-image`, `ion-lang-1`; ION globals/env и active-tab marker введены. Старые `mtw-active-tab`, `__mtwStorageGlobals`, `MTW_*` оставлены как alias совместимости. В Android assets ещё есть `assets/js/index.html` со ссылкой на `mytonwallet-sdk.js`; проверить эту SDK-цепочку отдельно. Закреплённые dependency forks не переименовывать без готовой замены.
5. **Оставшиеся строки.** Legacy-названия встречаются в ключах локализаций, хотя значения уже содержат ION Wallet. Проверять отображаемые значения и достижимые экраны, а не считать каждое совпадение старым брендом в UI. Удалённый Telegram support не заменён новым каналом без решения продукта.

## Что проверено в этой сверке

- `npm run check:branding` — успешно: 13 анимаций, по 60 кадров, кадр 30 отрисован штатным RLottie; контактный лист просмотрен.
- iOS PNG — 1024×1024 без alpha; выборочно проверены размеры web/PWA/Android PNG/WebP, все три icon path из manifest существуют.
- Подтверждены отсутствие TON-партнёрских SVG, `duck_*`, `settings_mw-cards.svg` и удалённого `tonConnectFriendlyPatch.js`.
- После локальной зачистки P0 проходят TypeScript/ESLint/Stylelint, все 981 Jest-тест в 115 suites, проверка 13 анимаций, генерация локализаций и production webpack (с предупреждениями о размере bundle). Native/device и реальные транзакции не проверялись; локальное прохождение команд workflow не подтверждает запуск GitHub Actions.

## Приоритет оставшейся работы

- **До рабочего продукта:** ION explorer/marketplace/help переходы; проверка ION/BNB backend и dApp-подключений. Интеграцию BSC indexer согласовать с ведущимся backend-блоком.
- **До публикации:** legal/help/download, Firebase/push, domain associations, project IDs/registries, signing/update feeds, store listing и screenshots.
- **Финальная приёмка:** утверждение графики, web/extension/Electron и Android/iOS на устройствах, QR/deep links, создание/импорт/receive/send/staking. Exchange пока оболочка — bridge требует отдельного согласованного контракта и реализации.

## Повторяемая проверка

Перед каждым релизом:

1. Просмотреть все строки `wallet.ice.io` и каждый URL в пользовательском интерфейсе; для каждого должно быть опубликованное назначение и владелец.
2. Открыть приложение на web, Android, iOS, extension и Electron и проверить logo, icon, splash, QR, deep links и внешние переходы.
3. Выполнить поиск `mytonwallet`, `my wallet`, `gram`, `mtw`, `giveaway` и список отключённых продуктов. Совпадения в закреплённых зависимостях и тестовых данных оформлять отдельно с обоснованием.
4. Сверить store/registry metadata с package IDs: `io.ice.wallet`, iOS IONWallet targets, `ion://`, `ion-gateway://`, `ion-wc://` и стандартным URI ION Gateway `tc://`.
