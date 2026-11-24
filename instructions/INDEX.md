# Каталог инструкций

Ни один из этих файлов не загружается сам. Автоматически читается только корневой `CLAUDE.md` (и `CLAUDE.md` в папке, с файлами которой идёт работа). Нужные файлы отсюда читать явно, инструментом Read, перед задачей. Уже прочитанный в этой сессии файл не перечитывать.

## BUSINESS
| Файл | О чём |
|---|---|
| [business-strategy.md](business-strategy.md) | Кто мы, основная деятельность, цели, рынок, конкурентное преимущество, общие принципы и правило честности |
| [sales-and-messages.md](sales-and-messages.md) | Цены и пакеты, ответ на «сколько стоит», как писать клиентам, лимиты Telegram, ролики и сделанные темы |
| [client-search.md](client-search.md) | Поиск клиентов: кого искать, что определить, источники, фильтры, проверка контактов |

## WEBSITE DEVELOPMENT
| Файл | О чём |
|---|---|
| [website-development.md](website-development.md) | Архитектура, ограничения хостинга, где что лежит, команды, структура и технические требования |
| [premium-design.md](premium-design.md) | Стандарт дизайна: референс RCC Padel Arena, исследование, концепции, цвет «1+2+3», шрифты, фото, анимации, запреты, сайты-«кино» |
| [admin-panel.md](admin-panel.md) | Что умеет админка и обязательная проверка логики (5 типовых багов) |
| [quality-control.md](quality-control.md) | Проверка перед сдачей: телефон 390px, ошибки, формы, SEO, админка |

## IT PRODUCT
| Файл | О чём |
|---|---|
| [it-product-research.md](it-product-research.md) | Поиск своего продукта: что искать, как оценивать и представлять, проверка спроса |

## Что читать под задачу
| Задача | Файлы |
|---|---|
| Сайт с нуля | business-strategy, website-development, premium-design, admin-panel (если нужна админка) |
| Демо для лида | website-development, premium-design, sales-and-messages (текст письма) |
| Редизайн существующего сайта | premium-design, website-development, quality-control |
| Правки клиентского сайта | `projects/<клиент>/CLAUDE.md`, website-development; admin-panel, если трогаем админку |
| Подготовка к сдаче | website-development, quality-control, admin-panel (если проверяем админку) |
| Поиск клиентов, проверка лидов | business-strategy, client-search, sales-and-messages |
| Ответ клиенту, цена, отклик | sales-and-messages |
| Ролики и подписи | sales-and-messages (раздел «Ролики») |
| Поиск IT-идеи | business-strategy, it-product-research |
| Комплексная задача | все, что реально нужны, и только они |

Если задача меняется по ходу, догрузить недостающий файл.
