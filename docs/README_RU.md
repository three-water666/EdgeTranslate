# Боковой переводчик | Перевод по выделению на веб-страницах | Перевод PDF | MV3 | Бесплатно и с открытым исходным кодом


Другие языки:

- [English](../README.md)
- [简体中文](./README_CN.md)
- [繁體中文](./README_TW.md)

## Демонстрация

![demo_en](./images/demo_en.gif)

## Ручная установка

Расширение пока не опубликовано в магазинах браузеров. Сейчас его можно устанавливать вручную из пакетов на странице релизов или из распакованной локальной сборки. Страница релизов: [GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases).

### Chrome

- Распакуйте архив расширения в локальную папку.
- Откройте `chrome://extensions`.
- Включите `Developer mode`.
- Нажмите `Load unpacked`.
- Выберите папку с распакованным расширением.

### Microsoft Edge

- Распакуйте архив расширения в локальную папку.
- Откройте `edge://extensions`.
- Включите `Developer mode`.
- Нажмите `Load unpacked`.
- Выберите папку с распакованным расширением.

## Сборка

Для сборки расширения установите [Node.js](https://nodejs.org/) и [yarn](https://classic.yarnpkg.com/en/docs/install).

Клонируйте репозиторий:

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

Установите зависимости:

```shell
yarn
```

Соберите расширение:

```shell
yarn build:chrome
```

После сборки распакованная версия будет доступна в каталоге:

- `./packages/EdgeTranslate/build/chrome/`

## Загрузка распакованного расширения в браузер

### Chrome

- Откройте `chrome://extensions`.
- Включите `Developer mode`.
- Нажмите `Load unpacked`.
- Выберите `./packages/EdgeTranslate/build/chrome/`.

### Microsoft Edge

- Откройте `edge://extensions`.
- Включите `Developer mode`.
- Нажмите `Load unpacked`.
- Выберите `./packages/EdgeTranslate/build/chrome/`.

## Благодарность

Этот проект продолжает поддержку на основе исходного открытого проекта [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate). Спасибо оригинальным авторам и участникам за их работу.

##  Лицензия

[MIT](../LICENSE.MIT) и [NPL](../LICENSE.NPL)
