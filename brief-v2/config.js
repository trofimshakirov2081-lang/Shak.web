// Настройки брифа. Цены, бюджеты, палитры и шрифты меняются здесь, без правки логики.
window.BRIEF = {
  contacts: { telegram: "SHAKIROVtrofim", instagram: "shak.web" },

  // Если заполнить, заявка уйдёт в Telegram сама через бота. Пусто: клиент копирует ТЗ и пишет в личку.
  bot: { token: "", chatId: "" },

  // Цены: ставка 1000 ₽ в час, расклад по часам в ЦЕНЫ.md. Один пакет «Сайт под ключ».
  currency: { rub: { sign: "₽", rate: 1 } },
  base: { price: 13000, setup: 2500, days: 7, title: "Сайт под ключ с админкой" },
  // Скидки не складываются, берётся одна. Бриф пройден всегда, когда клиент видит итог.
  discount: { price: 1200, title: "скидка за пройденный бриф" },
  discountFull: { price: 3000, title: "скидка за полный брендбук и ТЗ с дизайном", link: "../tz/" },
  packages: [
    { id: "one", name: "Сайт под ключ", upTo: Infinity, text: "Всё нужное в одном пакете" }
  ],
  budgets: [
    { id: "b1", max: 13000, label: "до 13 000" },
    { id: "b2", max: 16000, label: "13 000 - 16 000" },
    { id: "b3", max: Infinity, label: "от 16 000" },
    { id: "idk", max: null, label: "Не знаю, посоветуйте" }
  ],

  niches: [
    { id: "kofeynya", name: "Кофейня", emoji: "☕", items: ["☕", "🥐", "🧋"] },
    { id: "konditerskaya", name: "Кондитерская, пекарня", emoji: "🧁", items: ["🍰", "🥐", "🧁"] },
    { id: "cvety", name: "Цветочная", emoji: "💐", items: ["💐", "🌷", "🌹"] },
    { id: "salon", name: "Салон красоты", emoji: "💅", items: ["💅", "✨", "💇‍♀️"] },
    { id: "studiya", name: "Студия, школа", emoji: "🧘‍♀️", items: ["🧘‍♀️", "🎨", "💃"] },
    { id: "other", name: "Другое", emoji: "✨", items: ["✨", "🛍️", "⭐"] }
  ],

  styles: [
    { id: "modern", name: "Современный", text: "Крупные заголовки, скруглённые карточки, много воздуха", words: "чисто, смело, по делу" },
    { id: "retro", name: "Ретро", text: "Рамки, засечки, тёплая бумага, как старая вывеска", words: "душевно, с историей, по-домашнему" },
    { id: "minimal", name: "Минимализм", text: "Тонкие линии, ничего лишнего, акцент на товаре", words: "спокойно, дорого, сдержанно" },
    { id: "bright", name: "Много всего", text: "Стикеры, наклоны, яркие плашки, весело и громко", words: "ярко, весело, с характером" },
    { id: "photo", name: "Много фото", text: "Сетка больших фотографий, текста по минимуму", words: "аппетитно, наглядно, живо" },
    { id: "type", name: "Без фото", text: "Огромная типографика вместо картинок", words: "дерзко, графично, запоминается" }
  ],

  // t: для каких сфер палитра подходит лучше всего (показываются первыми)
  palettes: [
    { n: "Карамель", c: ["#6B4226", "#C68E4E", "#FFF8EE", "#2A1A12"], t: ["konditerskaya", "kofeynya"] },
    { n: "Терракота", c: ["#B5523B", "#F2C14E", "#FFF8F1", "#2B1D16"], t: ["konditerskaya", "kofeynya", "other"] },
    { n: "Клубника со сливками", c: ["#D9536F", "#FFD6DE", "#FFF7F8", "#3A1F27"], t: ["konditerskaya", "salon"] },
    { n: "Фисташка", c: ["#6E8B3D", "#E9DFA8", "#FAF8EF", "#25301A"], t: ["konditerskaya", "kofeynya", "cvety"] },
    { n: "Черника", c: ["#4B3F72", "#F2B5D4", "#F9F7FF", "#1F1A33"], t: ["konditerskaya", "studiya"] },
    { n: "Ваниль и шоколад", c: ["#3E2723", "#F3E3C3", "#FFFBF2", "#1E1411"], t: ["konditerskaya", "kofeynya"] },
    { n: "Эспрессо", c: ["#2B1B14", "#D9A066", "#F4EDE4", "#1A100C"], t: ["kofeynya"] },
    { n: "Капучино", c: ["#8B5E3C", "#E7CBA9", "#FBF6EF", "#2E1E14"], t: ["kofeynya", "konditerskaya"] },
    { n: "Матча", c: ["#4F7A4A", "#DDE8C5", "#F7F9F2", "#1D2B1B"], t: ["kofeynya", "studiya"] },
    { n: "Ночной бар", c: ["#111111", "#E0B15C", "#F6F1E9", "#111111"], t: ["kofeynya", "other"] },
    { n: "Синий кобальт", c: ["#1F6BFF", "#FFD23F", "#F7F9FF", "#121826"], t: ["kofeynya", "studiya", "other"] },
    { n: "Сад", c: ["#2F5D50", "#E8B4A0", "#F6F3EE", "#1E2A26"], t: ["cvety"] },
    { n: "Пионы", c: ["#C2577A", "#F7D9E3", "#FFF8FA", "#3B1B28"], t: ["cvety", "salon"] },
    { n: "Лаванда", c: ["#7A5C9E", "#E6DAF5", "#FBF8FF", "#271B33"], t: ["cvety", "salon", "studiya"] },
    { n: "Шалфей", c: ["#6F8A6B", "#E8E1D3", "#F8F6F1", "#232B22"], t: ["cvety", "salon", "studiya"] },
    { n: "Подсолнух", c: ["#2E4A3B", "#F4C430", "#FFFBEA", "#1B2A22"], t: ["cvety", "other"] },
    { n: "Пудра", c: ["#B9787F", "#F3DCDC", "#FFF9F8", "#3A2427"], t: ["salon", "cvety"] },
    { n: "Нюд", c: ["#A47864", "#EAD7C7", "#FAF5F0", "#33241C"], t: ["salon"] },
    { n: "Шампань", c: ["#222222", "#C9A86A", "#FAF7F2", "#141414"], t: ["salon", "other"] },
    { n: "Ягодный", c: ["#8E2340", "#F5C6D0", "#FFF7F9", "#2B0E17"], t: ["salon", "konditerskaya"] },
    { n: "Мята", c: ["#2BA58A", "#CFF3E8", "#F5FCFA", "#123A31"], t: ["salon", "studiya"] },
    { n: "Энергия", c: ["#FF5A36", "#FFE14D", "#FFFAF0", "#1C1C1C"], t: ["studiya", "other"] },
    { n: "Спокойствие", c: ["#3B6E8F", "#CFE3EE", "#F5F9FC", "#132634"], t: ["studiya"] },
    { n: "Неон", c: ["#6C2BD9", "#3DF2B0", "#F7F5FF", "#160B2E"], t: ["studiya", "other"] },
    { n: "Песок и море", c: ["#1E6F78", "#F1D7A6", "#FBF7EF", "#0F2E31"], t: ["studiya", "other"] },
    { n: "Графит", c: ["#2E2E33", "#F06F5B", "#F7F7F7", "#17171A"], t: ["other", "studiya"] },
    { n: "Оливка", c: ["#5F6B3A", "#E4C9A3", "#F8F5EC", "#22261A"], t: ["other", "cvety"] },
    { n: "Бордо", c: ["#6D1F2F", "#E9C9A8", "#FBF6F1", "#24090F"], t: ["other", "kofeynya"] },
    { n: "Леденец", c: ["#F25C9A", "#7FD1F7", "#FFF8FC", "#2A1020"], t: ["konditerskaya", "other"] },
    { n: "Лимонад", c: ["#F2A007", "#2BB3A3", "#FFFCF2", "#2A2109"], t: ["kofeynya", "other"] }
  ],

  // one: у шрифта только обычное начертание
  fonts: [
    { h: "Playfair Display", b: "Manrope", n: "Классика", t: ["konditerskaya", "cvety", "salon"] },
    { h: "Cormorant Garamond", b: "Montserrat", n: "Изящный", t: ["cvety", "salon"] },
    { h: "Lora", b: "Nunito", n: "Тёплый", t: ["konditerskaya", "kofeynya"] },
    { h: "Prata", b: "Manrope", n: "Бутик", t: ["salon", "cvety"], one: ["Prata"] },
    { h: "Yeseva One", b: "Raleway", n: "Нежный", t: ["konditerskaya", "cvety", "salon"], one: ["Yeseva One"] },
    { h: "Lobster", b: "Nunito", n: "Кондитерский", t: ["konditerskaya", "kofeynya"], one: ["Lobster"] },
    { h: "Pacifico", b: "Rubik", n: "Курортный", t: ["kofeynya", "konditerskaya"], one: ["Pacifico"] },
    { h: "Caveat", b: "Manrope", n: "От руки", t: ["kofeynya", "konditerskaya", "cvety"] },
    { h: "Comfortaa", b: "Nunito", n: "Мягкий", t: ["konditerskaya", "studiya"] },
    { h: "Unbounded", b: "Manrope", n: "Смелый", t: ["kofeynya", "studiya", "other"] },
    { h: "Rubik", b: "Rubik", n: "Дружелюбный", t: ["kofeynya", "studiya", "other"] },
    { h: "Montserrat", b: "Montserrat", n: "Универсальный", t: ["other", "studiya", "salon"] },
    { h: "Oswald", b: "Inter", n: "Спортивный", t: ["studiya", "kofeynya"] },
    { h: "Russo One", b: "Inter", n: "Энергичный", t: ["studiya", "other"], one: ["Russo One"] },
    { h: "Jost", b: "Jost", n: "Геометрия", t: ["salon", "studiya", "other"] },
    { h: "Tenor Sans", b: "Manrope", n: "Модный", t: ["salon", "cvety"], one: ["Tenor Sans"] },
    { h: "Forum", b: "Raleway", n: "Античный", t: ["salon", "cvety"], one: ["Forum"] },
    { h: "Marck Script", b: "Lora", n: "Каллиграфия", t: ["cvety", "konditerskaya"], one: ["Marck Script"] },
    { h: "PT Serif", b: "PT Sans", n: "Газетный", t: ["kofeynya", "other"] },
    { h: "Merriweather", b: "Open Sans", n: "Надёжный", t: ["other", "studiya"] },
    { h: "Amatic SC", b: "Nunito", n: "Крафт", t: ["kofeynya", "konditerskaya"] },
    { h: "Exo 2", b: "Exo 2", n: "Технологичный", t: ["studiya", "other"] },
    { h: "Golos Text", b: "Golos Text", n: "Нейтральный", t: ["other", "salon"] },
    { h: "El Messiri", b: "Raleway", n: "Восточный", t: ["kofeynya", "cvety", "other"] }
  ],

  // price 0: уже есть в моих шаблонах, входит в пакет. price null: по договорённости, в сумму не входит.
  features: [
    { id: "cart", icon: "🛒", title: "Корзина и заказы в Telegram", price: 0, days: 0, t: ["konditerskaya", "kofeynya", "cvety"] },
    { id: "booking", icon: "📅", title: "Запись или заявка на пробное", price: 0, days: 0, t: ["salon", "studiya", "other"] },
    { id: "delivery", icon: "🚚", title: "Доставка: зоны и стоимость", price: 0, days: 0, t: ["cvety", "konditerskaya"] },
    { id: "reviews", icon: "⭐", title: "Отзывы клиентов", price: 0, days: 0, t: ["salon", "studiya", "konditerskaya", "cvety"] },
    { id: "gallery", icon: "🖼️", title: "Галерея и портфолио", price: 0, days: 0, t: ["salon", "studiya"] },
    { id: "promo", icon: "🏷️", title: "Акции и промокоды", price: 0, days: 0 },
    { id: "loyalty", icon: "🎁", title: "Бонусы и «приведи друга»", price: 0, days: 0 },
    { id: "account", icon: "👤", title: "Личный кабинет клиента", price: 0, days: 0 },
    { id: "builder", icon: "🎂", title: "Конструктор торта или букета", price: 0, days: 0 },
    { id: "payment", icon: "💳", title: "Онлайн-оплата (карты, СБП)", price: null, days: 1 },
    { id: "lang", icon: "🌐", title: "Английская версия сайта", price: null, days: 2 },
    { id: "content", icon: "📸", title: "Тексты и подбор фото за вас", price: null, days: 1 },
    { id: "logo", icon: "✏️", title: "Разработка логотипа", price: null, days: 0 }
  ]
};
