# Боковой переводчик | Расширение для перевода в браузере | Перевод PDF | MV3 | Бесплатно и с открытым исходным кодом

Другие языки:

-   [English](../README.md)
-   [简体中文](./README_CN.md)
-   [繁體中文](./README_TW.md)

## Демонстрация

### Пример перевода выделенного текста

![selection_translation_demo_en](./images/demo_en.gif)

### Пример перевода по долгому нажатию

![long_press_translate](./images/long_press_translate.gif)

### Пример перевода скриншота

![screenshot_translate](./images/screenshot_translate.gif)

## Установка из магазина

Рекомендуемый способ установки Edge Translate - через [Chrome Web Store](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb). Chrome может установить расширение напрямую, а Microsoft Edge также поддерживает установку из Chrome Web Store.

### Chrome

-   Откройте [страницу расширения в Chrome Web Store](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb).
-   Нажмите `Add to Chrome`.
-   Подтвердите установку в браузере.

### Microsoft Edge

-   Откройте [страницу расширения в Chrome Web Store](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb) в Microsoft Edge.
-   Если браузер попросит, разрешите установку расширений из других магазинов.
-   Нажмите `Add to Chrome`.
-   Подтвердите установку в браузере.

## Ручная установка

Если нужно установить release-пакет вручную или загрузить распакованную локальную сборку, пакеты доступны на странице [GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases).

### Chrome

-   Распакуйте архив расширения в локальную папку.
-   Откройте `chrome://extensions`.
-   Включите `Developer mode`.
-   Нажмите `Load unpacked`.
-   Выберите папку с распакованным расширением.

### Microsoft Edge

-   Распакуйте архив расширения в локальную папку.
-   Откройте `edge://extensions`.
-   Включите `Developer mode`.
-   Нажмите `Load unpacked`.
-   Выберите папку с распакованным расширением.

## Сборка

Для сборки расширения установите [Node.js](https://nodejs.org/) и [pnpm](https://pnpm.io/installation).

Клонируйте репозиторий:

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

Установите зависимости:

```shell
pnpm install
```

Соберите расширение:

```shell
pnpm build
```

После сборки распакованная версия будет доступна в каталоге:

-   `./packages/EdgeTranslate/build/chrome/`

Создайте zip-пакет:

```shell
pnpm package
```

После упаковки release-пакет будет доступен в каталоге:

-   `./packages/EdgeTranslate/artifacts/`

Запустите разработческую сборку с отслеживанием файлов:

```shell
pnpm dev
```

Результат разработческой сборки будет доступен в каталоге:

-   `./packages/EdgeTranslate/dev/chrome/`

## Благодарность

Этот проект продолжает поддержку на основе исходного открытого проекта [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate). Спасибо оригинальным авторам и участникам за их работу.

## Лицензия

[MIT](../LICENSE.MIT) и [NPL](../LICENSE.NPL)
