# PROPEDIK — Интерактивный тренажёр по пропедевтике внутренних болезней (Пульмонология)

Профессиональный интерактивный медицинский тренажёр для отработки навыков аускультации лёгких, интерпретации рентгенограмм органов грудной клетки, синдромальной диагностики и клинического тестирования в соответствии с программой кафедры пропедевтики внутренних болезней.

---

## 🗂 Структура репозитория

Проект разделен на два независимых потока разработки:

```text
Propedik/
├── propedik-web/             # Поток 1: Автономная веб-платформа для браузеров и GitHub Pages
│   ├── index.html            # Главная интерактивная страница
│   ├── css/style.css         # Фирменный адаптивный дизайн
│   ├── js/app.js             # Логика точек, синтезатора, плеера и Leitner-алгоритма
│   ├── js/data.js            # Структурированная клиническая база данных
│   ├── audio/                # Аудиозаписи дыхательных шумов и патологий
│   ├── image/                # Рентгенограммы и схемы легких
│   ├── icons/                # Фирменные векторные и растровые иконки
│   └── docs/                 # Учебно-методические пособия (PDF)
│
├── propedik-mobile/          # Поток 2: Полноценное мобильное приложение для Android
│   ├── android/              # Нативный проект Android (Gradle + Java)
│   ├── build-mobile.js       # Скрипт сборки и синхронизации веб-ассетов
│   ├── capacitor.config.json # Конфигурация мобильной платформы
│   ├── package.json          # Зависимости Capacitor
│   └── PROPEDIK.apk          # Готовый установочный APK-файл
│
├── index.html                # Корневой перенаправитель (редистрибутив на propedik-web)
├── PROPEDIK.apk              # Установочный пакет Android для быстрой загрузки
└── README.md
```

---

## 🚀 Дистрибутивы и доступ

### 🌐 1. Веб-версия (GitHub Pages)
Веб-платформа доступна онлайн без необходимости установки:
👉 **[Открыть PROPEDIK Web](https://eternal-ahudis.github.io/Propedik/)**

### 📱 2. Мобильное приложение Android (APK Release)
Автономное мобильное приложение со встроенным аудио, нижним таббаром и адаптивной иконкой-фонендоскопом доступно в разделе релизов:
👉 **[Релиз Android: PROPEDIK Mobile](https://github.com/Eternal-ahudis/Propedik/releases/tag/propedik-mobile)**

Прямой установочный файл APK также доступен в репозитории:
- [propedik-mobile/PROPEDIK.apk](file:///c:/Users/DJ%20PIDARAS/Desktop/Propedik/propedik-mobile/PROPEDIK.apk) (~26.0 МБ)

---

## 👨‍⚕️ Автор и контакты
- **Автор:** Ян Ситдиков (Yan Sitdikov)
- **Email:** [sitdikof.jan@gmail.com](mailto:sitdikof.jan@gmail.com)
- **ВКонтакте:** [vk.ru/eternal_ahudis](https://vk.ru/eternal_ahudis)
- **GitHub:** [github.com/Eternal-ahudis/Propedik](https://github.com/Eternal-ahudis/Propedik)

## 📄 Лицензия
MIT License — Copyright (c) 2026 Yan Sitdikov.
