-- Config (ModuleScript в ReplicatedStorage)
-- Все цифры и тексты игры «Барбер-мутант» (Mutant Barber). Меняйте здесь, код трогать не нужно.

local C = {}

C.Version = 1
C.StartCash = 50
-- UserId админов (создатель игры админ всегда). Пример: {12345678}
C.Admins = {}

-- Редкости: шанс появления на улице задаёт weight
C.Rarities = {
	{ id = "common",    ru = "Обычный",     en = "Common",    color = Color3.fromRGB(200, 200, 200), weight = 60 },
	{ id = "rare",      ru = "Редкий",      en = "Rare",      color = Color3.fromRGB(80, 160, 255),  weight = 25 },
	{ id = "epic",      ru = "Эпический",   en = "Epic",      color = Color3.fromRGB(180, 100, 255), weight = 10 },
	{ id = "legendary", ru = "Легендарный", en = "Legendary", color = Color3.fromRGB(255, 180, 40),  weight = 4 },
	{ id = "mythic",    ru = "Мифический",  en = "Mythic",    color = Color3.fromRGB(255, 70, 120),  weight = 0.9 },
	{ id = "secret",    ru = "Секретный",   en = "Secret",    color = Color3.fromRGB(255, 255, 255), weight = 0.1 },
}

local LIGHT = Color3.fromRGB(234, 184, 146)
local TAN = Color3.fromRGB(196, 136, 98)

-- Клиенты. r: номер редкости, price: цена, inc: доход в секунду, style: причёска
C.Clients = {
	{ rp = "Пет", rs = "петя", ep = "Pe", es = "pete", ru = "Школьник Петя", en = "Schoolboy Pete", r = 1, price = 15, inc = 1, scale = 0.85,
		skin = LIGHT, shirt = Color3.fromRGB(70, 130, 220), pants = Color3.fromRGB(40, 50, 80), hair = Color3.fromRGB(120, 80, 40), style = { "short" } },
	{ rp = "Оле", rs = "олег", ep = "Ole", es = "oleg", ru = "Офисный Олег", en = "Office Oleg", r = 1, price = 40, inc = 2,
		skin = LIGHT, shirt = Color3.fromRGB(235, 235, 240), pants = Color3.fromRGB(50, 50, 60), hair = Color3.fromRGB(40, 30, 25), style = { "pomp" } },
	{ rp = "Бабу", rs = "бушка", ep = "Gran", es = "granny", ru = "Бабушка с химией", en = "Granny Perm", r = 1, price = 75, inc = 4, scale = 0.9,
		skin = LIGHT, shirt = Color3.fromRGB(200, 120, 170), pants = Color3.fromRGB(90, 60, 100), hair = Color3.fromRGB(205, 195, 235), style = { "afro" } },
	{ rp = "Тикто", rs = "токер", ep = "Tik", es = "tokker", ru = "Тиктокер", en = "TikToker", r = 1, price = 120, inc = 6,
		skin = TAN, shirt = Color3.fromRGB(25, 25, 30), pants = Color3.fromRGB(45, 45, 50), hair = Color3.fromRGB(255, 90, 170), style = { "spikes" } },
	{ rp = "Хип", rs = "пстер", ep = "Hip", es = "ster", ru = "Хипстер", en = "Hipster", r = 2, price = 350, inc = 15,
		skin = LIGHT, shirt = Color3.fromRGB(190, 90, 60), pants = Color3.fromRGB(60, 80, 120), hair = Color3.fromRGB(110, 70, 40), style = { "bun", "beard" } },
	{ rp = "Ро", rs = "рокер", ep = "Ro", es = "rocker", ru = "Рокер", en = "Rocker", r = 2, price = 600, inc = 24,
		skin = LIGHT, shirt = Color3.fromRGB(20, 20, 20), pants = Color3.fromRGB(30, 30, 60), hair = Color3.fromRGB(20, 20, 20), style = { "long" } },
	{ rp = "Футбо", rs = "болист", ep = "Foot", es = "baller", ru = "Футболист", en = "Footballer", r = 2, price = 900, inc = 35,
		skin = TAN, shirt = Color3.fromRGB(230, 40, 50), pants = Color3.fromRGB(245, 245, 245), hair = Color3.fromRGB(240, 210, 120), style = { "mohawk" } },
	{ rp = "Стри", rs = "ример", ep = "Strea", es = "streamer", ru = "Стример", en = "Streamer", r = 2, price = 1500, inc = 55,
		skin = LIGHT, shirt = Color3.fromRGB(120, 60, 220), pants = Color3.fromRGB(30, 30, 40), hair = Color3.fromRGB(60, 220, 240), style = { "spikes" } },
	{ rp = "Кача", rs = "качок", ep = "Gym", es = "bro", ru = "Качок", en = "Gym Bro", r = 3, price = 5000, inc = 150, scale = 1.3,
		skin = TAN, shirt = Color3.fromRGB(240, 240, 240), pants = Color3.fromRGB(30, 30, 30), hair = Color3.fromRGB(30, 20, 15), style = { "short" } },
	{ rp = "Вики", rs = "кинг", ep = "Vi", es = "king", ru = "Викинг", en = "Viking", r = 3, price = 9000, inc = 260, scale = 1.2,
		skin = LIGHT, shirt = Color3.fromRGB(110, 80, 50), pants = Color3.fromRGB(70, 55, 40), hair = Color3.fromRGB(230, 120, 40), style = { "long", "beard" } },
	{ rp = "Саму", rs = "мурай", ep = "Samu", es = "rai", ru = "Самурай", en = "Samurai", r = 3, price = 15000, inc = 400,
		skin = LIGHT, shirt = Color3.fromRGB(40, 40, 90), pants = Color3.fromRGB(30, 30, 50), hair = Color3.fromRGB(15, 15, 15), style = { "bun" } },
	{ rp = "Кло", rs = "лоун", ep = "Clo", es = "clown", ru = "Клоун", en = "Clown", r = 3, price = 22000, inc = 560,
		skin = Color3.fromRGB(250, 245, 240), shirt = Color3.fromRGB(250, 220, 40), pants = Color3.fromRGB(40, 120, 230), hair = Color3.fromRGB(255, 60, 60), style = { "afro" } },
	{ rp = "Космо", rs = "навт", ep = "Astro", es = "naut", ru = "Космонавт", en = "Astronaut", r = 4, price = 80000, inc = 1800,
		skin = LIGHT, shirt = Color3.fromRGB(240, 240, 245), pants = Color3.fromRGB(230, 230, 235), hair = Color3.fromRGB(90, 60, 30), style = { "short", "helmet" } },
	{ rp = "Кото", rs = "кот", ep = "Cat", es = "cat", ru = "Кот-барин", en = "Sir Cat", r = 4, price = 140000, inc = 3000, scale = 0.85,
		skin = Color3.fromRGB(240, 150, 60), shirt = Color3.fromRGB(120, 30, 40), pants = Color3.fromRGB(40, 30, 30), hair = Color3.fromRGB(240, 150, 60), style = { "ears" } },
	{ rp = "Робо", rs = "бот", ep = "Robo", es = "bot", ru = "Робо-барбер", en = "Robo-Barber", r = 4, price = 220000, inc = 4500,
		skin = Color3.fromRGB(170, 175, 185), shirt = Color3.fromRGB(90, 95, 110), pants = Color3.fromRGB(60, 65, 75), hair = Color3.fromRGB(255, 80, 60), style = { "mohawk" } },
	{ rp = "Дино", rs = "завр", ep = "Dino", es = "saur", ru = "Динозавр в парике", en = "Wig Dino", r = 5, price = 1200000, inc = 22000, scale = 1.35,
		skin = Color3.fromRGB(110, 190, 80), shirt = Color3.fromRGB(110, 190, 80), pants = Color3.fromRGB(90, 160, 60), hair = Color3.fromRGB(250, 230, 150), style = { "long" } },
	{ rp = "Прише", rs = "шелец", ep = "Ali", es = "lien", ru = "Пришелец", en = "Alien", r = 5, price = 2500000, inc = 42000,
		skin = Color3.fromRGB(140, 255, 140), shirt = Color3.fromRGB(50, 50, 70), pants = Color3.fromRGB(40, 40, 60), hair = Color3.fromRGB(140, 255, 140), style = { "antenna" } },
	{ rp = "Ежо", rs = "ёж", ep = "Hedge", es = "hog", ru = "Ёж-панк", en = "Punk Hedgehog", r = 5, price = 4000000, inc = 65000, scale = 0.9,
		skin = Color3.fromRGB(150, 110, 80), shirt = Color3.fromRGB(30, 30, 30), pants = Color3.fromRGB(70, 30, 30), hair = Color3.fromRGB(60, 40, 30), style = { "spikesBig" } },
	{ rp = "Лысо", rs = "король", ep = "Bald", es = "king", ru = "Лысый король", en = "Bald King", r = 6, price = 25000000, inc = 350000,
		skin = LIGHT, shirt = Color3.fromRGB(150, 20, 40), pants = Color3.fromRGB(60, 10, 20), hair = Color3.fromRGB(255, 200, 40), style = { "bald", "crown" } },
	{ rp = "Барбе", rs = "барбер", ep = "Barb", es = "barber", ru = "Тот самый барбер", en = "The Barber", r = 6, price = 60000000, inc = 800000, scale = 1.1,
		skin = TAN, shirt = Color3.fromRGB(250, 250, 250), pants = Color3.fromRGB(30, 30, 30), hair = Color3.fromRGB(20, 20, 20), style = { "pomp", "beard" } },
	-- босс: на улице не появляется, достаётся тому, кто больше всех стриг Йети
	{ rp = "Йе", rs = "йети", ep = "Ye", es = "yeti", ru = "Йети", en = "Yeti", r = 6, price = 40000000, inc = 500000, scale = 1.2, boss = true,
		skin = Color3.fromRGB(225, 240, 255), shirt = Color3.fromRGB(235, 245, 255), pants = Color3.fromRGB(210, 225, 245), hair = Color3.fromRGB(250, 252, 255), style = { "afro", "beard" } },
}

-- Скрещивание: голова и причёска от первого, тело от второго, доход суммы x1.5
C.FusionBonus = 1.5
function C.stats(cid, cid2)
	local a = C.Clients[cid]
	if not cid2 then return a.price, a.inc, a.r end
	local b = C.Clients[cid2]
	return math.floor((a.price + b.price) * C.FusionBonus), math.floor((a.inc + b.inc) * C.FusionBonus), math.max(a.r, b.r)
end
function C.name(cid, cid2, ru)
	local a = C.Clients[cid]
	if not cid2 then return ru and a.ru or a.en end
	local b = C.Clients[cid2]
	return ru and (a.rp .. b.rs) or (a.ep .. b.es)
end

-- Растущие причёски: раз в GrowEvery секунд +1 уровень, доход и размер растут
C.GrowEvery = 30
C.GrowMax = 20
C.TrimMin = 5          -- с какого уровня чужую причёску можно срезать
C.TrimSeconds = 120    -- срезавший получает доход клиента за столько секунд
function C.growMult(g) return 1 + 0.1 * (g or 0) end
function C.growSize(g) return 1 + 0.2 * (g or 0) end

-- Машинка: бреет игроков налысо
C.ShaveCooldown = 1.2
C.ShaveRange = 8
C.ShavedTime = 25      -- сколько секунд игрок ходит лысым
C.ShaveImmune = 20     -- потом столько секунд его нельзя побрить снова
C.ShaveSlowTime = 5
C.ShaveSlowSpeed = 9

-- Босс Йети
C.BossHpPerPlayer = 50
C.BossMinHp = 60
C.BossRange = 16
C.BossMinHits = 3

-- Мутации: выпадают при стрижке (chance) и иногда на улице. mult: множитель дохода
C.Mutations = {
	none    = { mult = 1,  chance = 0,    ru = "",       en = "",        color = Color3.new(1, 1, 1) },
	gold    = { mult = 2,  chance = 0.20, ru = "Золото", en = "Gold",    color = Color3.fromRGB(255, 200, 40) },
	diamond = { mult = 3,  chance = 0.08, ru = "Алмаз",  en = "Diamond", color = Color3.fromRGB(120, 230, 255) },
	rainbow = { mult = 5,  chance = 0.03, ru = "Радуга", en = "Rainbow", color = Color3.fromRGB(255, 80, 200) },
	cosmic  = { mult = 10, chance = 0.01, ru = "Космос", en = "Cosmic",  color = Color3.fromRGB(120, 50, 220) },
	star    = { mult = 6,  chance = 0,    ru = "Звезда", en = "Star",    color = Color3.fromRGB(255, 240, 120) },
}
C.CutOrder = { "gold", "diamond", "rainbow", "cosmic" } -- что может выпасть при стрижке
C.MutOrder = { "gold", "diamond", "rainbow", "cosmic", "star" } -- порядок в коллекции
C.StreetMutGold = 0.04    -- шанс, что клиент на улице уже золотой
C.StreetMutDiamond = 0.01

-- Улица
C.SpawnEvery = 3
C.SpawnEveryRush = 1
C.MaxStreet = 18
C.WalkSpeed = 7

-- События сервера
C.EventEvery = 480 -- раз в 8 минут
C.EventOrder = { "boss", "rush", "boss", "balm", "boss", "star" }
C.Events = {
	rush = { dur = 180, ru = "Час пик! Клиенты валят толпой, редкие чаще", en = "Rush hour! Crowds of clients, rare ones more often" },
	balm = { dur = 180, ru = "Ливень бальзама! Весь доход x2", en = "Balm rain! All income x2" },
	star = { dur = 60,  ru = "Звёздный клиент на улице! Успей купить", en = "A star client is on the street! Grab it" },
	boss = { dur = 150, ru = "Йети пришёл стричься! Бейте его машинкой всем сервером", en = "The Yeti wants a haircut! Hit him with your clippers together" },
}
C.PaidRushDur = 300

-- Кресла, дверь, перерождения
C.BaseChairs = 4
C.MaxChairs = 10
C.VipChairs = 2
function C.chairCost(n) return 250 * 5 ^ (n - C.BaseChairs) end
C.MaxLock = 6
function C.lockDur(l) return 30 + 10 * l end
function C.lockCost(l) return 500 * 4 ^ l end
function C.rebirthCost(r) return 1000000 * (r + 1) ^ 2 end
function C.rebirthMult(r) return 1 + 0.5 * r end

C.OfflineMax = 3 * 3600 -- копим офлайн максимум 3 часа
C.OfflineRate = 0.5     -- половина обычного дохода
C.StealTimeout = 45     -- за сколько секунд вор должен донести клиента
C.SellRate = 0.5

-- Покупки за робуксы. id = 0: кнопка скрыта. Вставьте ID после создания в Creator Hub.
C.Passes = {
	{ key = "x2",   id = 0, ru = "Доход x2", en = "2x Cash", dru = "Навсегда удваивает весь доход", den = "Doubles all income forever" },
	{ key = "luck", id = 0, ru = "Счастливые ножницы", en = "Lucky Scissors", dru = "Шанс мутации при стрижке x2", den = "2x mutation chance on haircuts" },
	{ key = "vip",  id = 0, ru = "VIP-зал", en = "VIP Room", dru = "+2 кресла сверх максимума", den = "+2 chairs above the max" },
}
C.Products = {
	{ key = "cash1",  id = 0, minutes = 5,  min = 5000,   ru = "Пачка денег", en = "Cash Stack", dru = "Доход за 5 минут сразу", den = "5 minutes of income at once" },
	{ key = "cash2",  id = 0, minutes = 60, min = 100000, ru = "Мешок денег", en = "Cash Bag", dru = "Доход за час сразу", den = "1 hour of income at once" },
	{ key = "luck10", id = 0, ru = "Удача x3 на 10 минут", en = "3x Luck for 10 min", dru = "Мутации при стрижке выпадают чаще", den = "Haircut mutations drop more often" },
	{ key = "rush",   id = 0, ru = "Час пик для всего сервера", en = "Server Rush Hour", dru = "5 минут толпы клиентов для всех игроков", den = "5 minutes of crowds for everyone" },
}

-- Коды (вводятся без учёта регистра)
C.Codes = {
	SHAKWEB = { cash = 1000 },
	BARBER = { cash = 300 },
	LUCKY = { luck = 600 },
}

-- 1234567 -> 1.23M
local SUF = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc" }
function C.fmt(n)
	n = math.floor(tonumber(n) or 0)
	if n < 1000 then return tostring(n) end
	local i, x = 1, n
	while x >= 1000 and i < #SUF do
		x = x / 1000
		i = i + 1
	end
	local s
	if x >= 100 then
		s = tostring(math.floor(x))
	elseif x >= 10 then
		s = string.format("%.1f", math.floor(x * 10) / 10)
	else
		s = string.format("%.2f", math.floor(x * 100) / 100)
	end
	if string.find(s, "%.") then
		s = (string.gsub(s, "0+$", ""))
		s = (string.gsub(s, "%.$", ""))
	end
	return s .. SUF[i]
end

return C
