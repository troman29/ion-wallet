# Migration to ION

Этот файл — рабочий план превращения MyTonWallet в ION Wallet. Он фиксирует согласованный объём миграции, фактический статус и блокеры. Обновляем его после каждого законченного блока работы.

## Цель

Выпустить ION Wallet на базе MyTonWallet для сети ION (TON-совместимая сеть) и ION в BNB Chain. Оставляем Capacitor-приложения для Android и iOS, а также web, расширение браузера и Electron. Ненужные продукты, сети, бренды и инфраструктурные зависимости удаляем.

## Текущее состояние

Рабочая ветка: `ion/restore-capacitor`. Статус фиксируется вместе с каждым блоком миграции.

| Область | Статус | Что сделано |
| --- | --- | --- |
| Capacitor | ✅ | Восстановлены мобильные Android/iOS-обёртки Capacitor. Старое нативное Air-приложение удалено. |
| Лишние продукты | ✅ | Удалены Portfolio, Multisend, MyTonWallet Cards, MyCoin и его vesting, nominator staking, покупка и продажа за банковские карты. |
| Сети | ✅ | Удалены Tron и Solana. Из EVM оставлена только BNB Chain; из токенов BNB оставлен только ION. |
| Бренды и Explorer | ◐ | Удалены Gram Wallet и его iOS widget extension. Переименованы web/npm, Android и iOS targets, desktop-артефакты, package IDs, TonConnect/EIP-6963 identifiers и основные deep link-схемы в ION Wallet. |
| История релизов и CI | ✅ | Удалены changelogs и неактуальные build/deploy-пайплайны. |
| ION API и инфраструктура | ◐ | Runtime URL переведены на `wallet.ice.io`; в предпросмотре подключён ION RPC v2. Полноценного совместимого v3 indexer пока нет. Firebase использует безопасную заглушку до получения настоящих ключей. |
| Agent | ✅ | Удалены оставшиеся ключи storage и локализаций, CI-задачи, иконки, анимации, CSS и комментарии. |
| iOS-проект | ◐ | Удалены Air-only targets, Gram Wallet и widget extension; рабочие схемы — `IONWallet`, `IONWallet_NoExtensions`, `IONWallet_Preview`. `pod install` и `cap sync ios` проходят. Осталось проверить сборку на симуляторе или устройстве. |

## Решения, которые уже приняты

- Поддерживаем только ION/TON и BNB Chain.
- Нативный Air не возвращаем. Мобильные приложения работают через Capacitor.
- Механизм миграций хранилища сохраняем, но проектные миграционные шаги не переносим.
- Кастомизация кошелька остаётся, MyTonWallet Cards и их minting — нет.
- Token staking и liquid staking сохраняем; nominator staking — нет.
- ION должен быть доступен как нативный актив сети ION и как единственный поддерживаемый ION-токен в BNB Chain.

## Открытая работа

### P0 — необходимое до первого рабочего релиза

- [x] **Удалить MFA / Telegram 2FA.**
  - Удалены отдельная сборка, npm-команды, экран настроек, ассеты, контракты, сетевые обращения, состояния интерфейса, локализации и каталог `src/mfa`.
  - Обычные пароль/PIN, биометрия и аппаратные кошельки сохраняются.

- [x] **Удалить Telegram Mini App.**
  - Удалены отдельные сборки и CI-задача, SDK, Telegram-биометрия, полноэкранный режим, haptics, элементы интерфейса Mini App и специальная поддержка Telegram Gifts.
  - Удалены продуктовые ссылки на Telegram support, news и tips; антифишинговая проверка внешних `t.me` ссылок сохранена.

- [x] **Удалить gasless / Diesel.**
  - Удалены расчёт и оплата комиссий Diesel, backend-вызовы, платёжный шлюз и варианты интерфейса для переводов и свапов.

- [x] **Завершить удаление Agent.**
  - Удалены продуктовые строки и storage keys Agent, CI-проверки и Chromium e2e-задача, иконки, анимации, CSS-классы и конфигурационные упоминания.
  - Нейтральные упоминания браузерного `userAgent` и стороннего dApp `agents.ton.org` сохранены: они не включают функциональность Agent.
  - Критерий выполнен: в пользовательском интерфейсе, сборках и CI Agent больше не существует.

- [ ] **Проверить iOS Capacitor-проект.**
  - Удалены Air package products, `AirWidgetExtension`, Air-only target и ссылки на удалённые файлы.
  - Проверить открытие проекта, `cap sync ios`, сборку и запуск на симуляторе или устройстве.

- [ ] **Закрыть вопрос с ION activity API.**
  - ION RPC v2 отвечает на JSON-RPC вызовы и подходит для базовых операций.
  - Кошелёк использует v3 indexer для истории, pending activities и части данных об аккаунте.
  - Нужен совместимый ION v3 endpoint либо отдельная адаптация слоя активности. Подмена nginx не решает проблему.

- [ ] **Убрать зависимость preview от MyTonWallet backend.**
  - Проверить все запросы, которые ещё идут через `/api/` к MyTonWallet.
  - Для каждого выбрать ION-аналог, собственный сервис или осознанно удалить функцию.

### P1 — подготовка продукта к ребрендингу и выпуску

- [x] Переименовать основные пакеты, артефакты и нативные цели в **ION Wallet**.
  - npm package: `ion-wallet`; Capacitor app ID: `io.ice.wallet`; Android flavor: `ionwallet`; iOS schemes: `IONWallet*`.
  - Desktop-артефакты: `IONWallet-*`; Android direct APK: `IONWallet.apk`.
  - Удалён iOS target и ресурсы Gram Wallet, включая widget extension.
  - Android production-сборка проверена командой `:app:assembleIonwalletProdDebug`.
- [x] Заменить локальные схемы `ton://` и `mtw://` на `ion://`.
  - Для собственного TonConnect-канала используется `ion-tc://`; public links используют `wallet.ice.io`.
- [ ] Завершить замену внешней инфраструктуры.
  - Runtime RPC, API, static, TonConnect bridge и public URL используют `wallet.ice.io`; переменные окружения позволяют задать реальные endpoint-ы до выпуска.
  - Firebase-конфигурация заменена на нерабочую ION-заглушку: Android собирается, а iOS не вызывает `FirebaseApp.configure()` до установки настоящего `GOOGLE_APP_ID`. Перед выпуском нужны конфиги из ION Firebase Console.
  - GitHub forks и npm scopes старого проекта пока сохранены только как закреплённые источники зависимостей; их нельзя переименовывать, пока не созданы эквивалентные ION forks.
  - Нужны доменные записи/`apple-app-site-association` и `assetlinks.json` для `wallet.ice.io`, а также рабочие ION backend endpoint-ы.
- [ ] Проверить BNB bridge/swap-путь для ION между ION/TON и BNB Chain.
- [ ] Пересмотреть CI после удаления Agent: оставить только проверки актуальных web и Capacitor целей.
- [ ] Закоммитить и перенести в репозиторий nginx-конфигурацию предпросмотра `wallet.lab.windbit.dev`, если она остаётся частью инфраструктуры проекта.

### P2 — проверка перед выпуском

- [ ] TypeScript, ESLint, Stylelint, Jest и production webpack build.
- [ ] Web: создание и импорт кошелька, receive, send, swap, staking, история, токены и TonConnect.
- [ ] Extension и Electron: запуск и основные пользовательские сценарии.
- [ ] Android Capacitor: `cap sync`, сборка, запуск, биометрия, QR, ссылки и уведомления.
- [ ] iOS Capacitor: `cap sync`, Xcode build, запуск, биометрия, QR, ссылки и уведомления.
- [ ] Ручная проверка с ION RPC и BNB Chain без обращений к удалённым сетям и продуктам MyTonWallet.

## Известные технические факты

- Предпросмотр на Home Lab уже умеет проксировать ION RPC v2. В нём также устранены утечка basic-auth заголовка в upstream и ошибочный SPA fallback для отсутствующих API.
- У ION пока нет совместимого v3 indexer. Без решения этого вопроса история операций не может считаться готовой.
- Android: `:app:assembleIonwalletProdDebug` проходит с Firebase-заглушкой. iOS: `cap sync ios --deployment` и `pod install` проходят; полноценная Xcode-сборка всё ещё требует установленный iOS runtime или подключённое устройство.
- В текущем checkout нет файла `AGENTS.md`. Запрошенная зачистка Agent относится к остаткам функциональности в коде и CI, перечисленным выше.

## Как обновлять план

После завершения пункта отмечаем его галочкой, добавляем ссылку на коммит и коротко фиксируем проверку. Если появляется новый блокер или решение меняет объём работы, сначала обновляем этот файл, затем код.
