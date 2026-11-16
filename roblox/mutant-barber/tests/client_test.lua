-- Прогон интерфейса игрока на имитации
local fails, passes = {}, 0
local function check(cond, msg) if cond then passes = passes + 1 else table.insert(fails, msg) print("  FAIL: " .. msg) end end
local new = M.newInstance
game = new("DataModel")
workspace = new("Workspace"); workspace.Name = "Workspace"; workspace.Parent = game
workspace.__methods = { GetServerTimeNow = function() return 1000 + M.now() end }
local cam = new("Camera"); cam.Name = "Camera"; cam.ViewportSize = Vector2.new(844, 390); cam.Parent = workspace
workspace.CurrentCamera = cam
local services = {}
local function svc(n) if not services[n] then services[n] = new(n); services[n].Name = n; services[n].Parent = game end return services[n] end
game.__methods = { GetService = function(_, n) if n == "Workspace" then return workspace end return svc(n) end }
local RunS = svc("RunService"); RunS.__p.RenderStepped = M.Signal.new(); RunS.__p.Heartbeat = M.Signal.new()
local hb = RunS.__p.RenderStepped
M.setHeartbeat(hb)
svc("TweenService").__methods = { Create = function() return { Play = function() end } end }
local bought = {}
svc("MarketplaceService").__methods = {
	PromptGamePassPurchase = function(_, p, id) table.insert(bought, id) end,
	PromptProductPurchase = function(_, p, id) table.insert(bought, id) end,
}
local Players = svc("Players")
local LP = new("Player"); LP.Name = "Me"; LP.UserId = 1; LP.LocaleId = LOCALE; LP.Parent = Players
local pg = new("PlayerGui"); pg.Name = "PlayerGui"; pg.Parent = LP
Players.LocalPlayer = LP
local RS = svc("ReplicatedStorage")
local C = assert(load(CONFIG_SRC, "Config"))()
for i, g in ipairs(C.Passes) do g.id = 200 + i end
for i, pr in ipairs(C.Products) do pr.id = 100 + i end
local cfg = new("ModuleScript"); cfg.Name = "Config"; cfg.__module = C; cfg.Parent = RS
local realRequire = require
require = function(x) if M.isInst(x) then return x.__module end return realRequire(x) end
local Net = Instance.new("RemoteEvent"); Net.Name = "Net"; Net.Parent = RS
local sent = {}
M.fireServer = function(...) table.insert(sent, { ... }) end
local Clients = new("Folder"); Clients.Name = "Clients"; Clients.Parent = workspace
local Map = new("Folder"); Map.Name = "Map"; Map.Parent = workspace

task.spawn(assert(load(CLIENT_SRC, "ClientUI")))
M.advance(0.5)
check(#M.errors == 0, "ошибка при запуске интерфейса")
check(sent[1] and sent[1][1] == "ready", "интерфейс не отправил ready")
local gui = pg:FindFirstChild("BarberUI")
check(gui ~= nil, "нет экрана интерфейса")

local function allText()
	local t = {}
	for _, o in ipairs(gui:GetDescendants()) do
		if (o.__class == "TextLabel" or o.__class == "TextButton" or o.__class == "TextBox") and o.Text then table.insert(t, o.Text) end
	end
	return t
end
local function badText(where)
	for _, s in ipairs(allText()) do
		if s:find("%%[sd]") or s:find("nil") then check(false, where .. ": плохой текст «" .. s .. "»") return end
	end
	passes = passes + 1
end

local idx = { ["1"] = true, ["3"] = true, ["1:gold"] = true, ["h:1:3"] = true, ["h:16:3"] = true }
local state = { cash = 123456, ips = 789, kassa = 10, reb = 1, chairs = 5, vip = 2, lock = 2, idx = idx, pass = { x2 = true }, luck = 300, cash1 = 5000, cash2 = 100000, carry = nil }
Net.OnClientEvent:Fire("state", state); M.advance(0.3)
badText("после state")

-- все сообщения сервера
local keys = { "noMoney", "handsFull", "noSeat", "placed", "stealOk", "stealFail", "returned", "locked", "cutNone", "nosave", "upgraded", "maxed", "codeOk", "codeBad", "codeUsed", "thanks", "carryDrop", "refund", "luckOn", "fuseCancel", "bossLeft" }
for _, k in ipairs(keys) do Net.OnClientEvent:Fire("toast", k) M.advance(0.05) badText("toast " .. k) end
local withArg = { stolen = "Bob", beingStolen = "Bob", lockOn = 40, collect = "1.2K", sold = "300", offline = "5K", rebirthed = "2", rebirthNo = "4M", paidRush = "Bob", cash = "5K", trimOk = "1K", trimmed = "Bob", shaveOk = "Bob", shaved = "Bob", shaveImmune = "Bob", bossDown = "Bob", bossReward = "2K", fuseSel = 3 }
for k, v in pairs(withArg) do Net.OnClientEvent:Fire("toast", k, v) M.advance(0.05) badText("toast " .. k) end
Net.OnClientEvent:Fire("toast", "cutRes", "cosmic", "10"); M.advance(0.05); badText("toast cutRes")
Net.OnClientEvent:Fire("toast", "fused", 16, 3); M.advance(0.05); badText("toast fused")
local hasFusedName = false
for _, s in ipairs(allText()) do if s:find(C.name(16, 3, LOCALE == "ru-ru"), 1, true) then hasFusedName = true end end
check(hasFusedName, "имя гибрида не показалось в сообщении")
for _, k in ipairs(keys) do
	for _, k2 in pairs({ k }) do end
end

-- события
for id in pairs(C.Events) do
	Net.OnClientEvent:Fire("event", id, 1000 + M.now() + 90); M.advance(0.5); badText("event " .. id)
end
Net.OnClientEvent:Fire("event", nil, 0); M.advance(0.3)

-- панели
local side
for _, f in ipairs(gui:GetChildren()) do
	if f.__class == "Frame" then
		local n = 0
		for _, c in ipairs(f:GetChildren()) do if c.__class == "TextButton" then n = n + 1 end end
		if n == 5 then side = f end
	end
end
check(side ~= nil, "нет боковых кнопок")
local btns = {}
for _, c in ipairs(side:GetChildren()) do if c.__class == "TextButton" then table.insert(btns, c) end end
table.sort(btns, function(a, b) return a.LayoutOrder < b.LayoutOrder end)
local names = { "shop", "upgrades", "index", "codes", "rebirth" }
for i, b in ipairs(btns) do
	b.Activated:Fire(); M.advance(0.2)
	check(#M.errors == 0, "ошибка в панели " .. names[i])
	badText("панель " .. names[i])
	Net.OnClientEvent:Fire("state", state); M.advance(0.2)
	check(#M.errors == 0, "ошибка при обновлении панели " .. names[i])
	if names[i] == "codes" then
		local box
		for _, o in ipairs(gui:GetDescendants()) do if o.__class == "TextBox" then box = o end end
		box.Text = "SHAKWEB"
		Net.OnClientEvent:Fire("state", state); M.advance(1.2)
		check(box.Parent ~= nil and box.Text == "SHAKWEB", "набранный код стёрся при обновлении")
		local red
		for _, o in ipairs(gui:GetDescendants()) do if o.__class == "TextButton" and o.Parent and o.Parent.__class == "ScrollingFrame" then red = o end end
		red.Activated:Fire(); M.advance(0.1)
		check(sent[#sent][1] == "code" and sent[#sent][2] == "SHAKWEB", "код не отправлен на сервер")
	end
	if names[i] == "shop" then
		local n = 0
		for _, o in ipairs(gui:GetDescendants()) do if o.__class == "TextButton" and o.Parent and o.Parent.__class == "Frame" and o.Parent.Parent and o.Parent.Parent.__class == "ScrollingFrame" then n = n + 1; o.Activated:Fire() end end
		M.advance(0.1)
		check(n == 7, "в магазине не 7 кнопок, а " .. n)
		check(#bought == 6, "купить можно не то число товаров (x2 куплен): " .. #bought)
	end
	if names[i] == "upgrades" then
		local before = #sent
		for _, o in ipairs(gui:GetDescendants()) do if o.__class == "TextButton" and o.Parent and o.Parent.Parent and o.Parent.Parent.__class == "ScrollingFrame" then o.Activated:Fire() end end
		M.advance(0.1)
		check(#sent == before + 2, "кнопки улучшений не отправили запросы")
	end
	if names[i] == "index" then
		local txt = table.concat(allText(), "|")
		check(txt:find(C.name(1, 3, LOCALE == "ru-ru"), 1, true) ~= nil, "открытый гибрид не показан в коллекции")
		check(txt:find("2", 1, true) ~= nil, "нет счётчика")
	end
	b.Activated:Fire(); M.advance(0.1) -- закрыть
end

-- подписи над клиентами
local function mkClient(attrs)
	local m = new("Model"); m.Name = "Client"
	local root = Instance.new("Part"); root.Name = "Root"; root.Parent = m
	local head = Instance.new("Part"); head.Name = "Head"; head.Parent = m
	local hair = Instance.new("Part"); hair.Name = "Hair"; hair.Parent = m
	for k, v in pairs(attrs) do m:SetAttribute(k, v) end
	m.Parent = Clients
	M.advance(0.2)
	return m
end
local function tagText(m)
	local t = {}
	for _, o in ipairs(m.Root:GetDescendants()) do if o.__class == "TextLabel" then table.insert(t, o.Text) end end
	return table.concat(t, " | ")
end
local s1 = mkClient({ Cid = 2, Mut = "none", State = "street", Price = 40, Grow = 0 })
print("  улица: " .. tagText(s1))
check(tagText(s1):find("$40", 1, true), "нет цены на улице")
local s2 = mkClient({ Cid = 16, Cid2 = 3, Mut = "rainbow", State = "seat", Owner = 1, Grow = 10 })
print("  гибрид: " .. tagText(s2))
local _, inc = C.stats(16, 3)
check(tagText(s2):find(C.fmt(inc * 5 * C.growMult(10)), 1, true), "доход гибрида с ростом и мутацией показан неверно")
check(tagText(s2):find(C.name(16, 3, LOCALE == "ru-ru"), 1, true), "нет имени гибрида")
s2:SetAttribute("Grow", 0); M.advance(0.1)
check(tagText(s2):find(C.fmt(inc * 5), 1, true), "доход не обновился после срезания причёски")
s2:SetAttribute("State", "carried"); M.advance(0.1)
badText("подписи")

-- подсказки
local part = Instance.new("Part"); part.Parent = workspace
local function mkPrompt(attrs)
	local pp = new("ProximityPrompt")
	for k, v in pairs(attrs) do pp:SetAttribute(k, v) end
	pp.Enabled = true
	pp.Parent = part
	M.advance(0.05)
	return pp
end
local p1 = mkPrompt({ K = "sell", V = "1K", Only = 1 })
check(p1.Enabled == true and p1.ActionText:find("$1K", 1, true), "своя кнопка продать: " .. tostring(p1.ActionText))
local p2 = mkPrompt({ K = "cut", Only = 2 })
check(p2.Enabled == false, "чужая кнопка стрижки видна")
local p3 = mkPrompt({ K = "steal", Not = 1 })
check(p3.Enabled == false, "кнопка украсть видна на своём клиенте")
local p4 = mkPrompt({ K = "trim", V = "5K", Not = 2 })
check(p4.Enabled == true, "кнопка срезать не видна на чужом")
p1:SetAttribute("V", "2K"); M.advance(0.05)
check(p1.ActionText:find("$2K", 1, true), "цена в кнопке не обновилась")
local lock = mkPrompt({ K = "lock", Only = 0 })
check(lock.Enabled == false, "кнопка чужой/пустой двери видна")
lock:SetAttribute("Only", 1); M.advance(0.05)
check(lock.Enabled == true, "кнопка своей двери не появилась после входа")
for _, pp in ipairs({ p1, p2, p3, p4, lock }) do
	check(not pp.ActionText:find("nil") and pp.ActionText ~= pp:GetAttribute("K"), "подсказка без перевода: " .. pp.ActionText)
end

-- переводимые надписи (Лысый, Йети)
local bg = new("BillboardGui"); local tl = new("TextLabel"); tl:SetAttribute("L", "bald"); tl.Text = "BALD"; tl.Parent = bg; bg.Parent = part
M.advance(0.05)
check(tl.Text ~= "BALD" or LOCALE ~= "ru-ru", "надпись ЛЫСЫЙ не переведена")

-- луч к дому, таймеры
local plot = new("Model"); plot.Name = "Plot1"; plot.Parent = Map
local home = Instance.new("Part"); home.Name = "Home"; home.Parent = plot
local att = new("Attachment"); att.Name = "A"; att.Parent = home
LP:SetAttribute("Plot", 1)
local ch = new("Model"); local hrp = Instance.new("Part"); hrp.Name = "HumanoidRootPart"; hrp.Parent = ch; LP.Character = ch; ch.Parent = workspace
state.carry = 3
Net.OnClientEvent:Fire("state", state); M.advance(0.6)
local beam = hrp:FindFirstChildOfClass("Beam")
check(beam and beam.Enabled, "нет луча к дому, когда несёшь клиента")
state.carry = nil
Net.OnClientEvent:Fire("state", state); M.advance(0.6)
check(beam and beam.Enabled == false, "луч не выключился")

print("")
print("ОШИБКИ ВЫПОЛНЕНИЯ: " .. #M.errors)
for i, e in ipairs(M.errors) do if i <= 5 then print(e) end end
print("ПРОВЕРОК ПРОЙДЕНО: " .. passes .. ", НЕ ПРОЙДЕНО: " .. #fails)
