-- ClientUI (LocalScript в StarterPlayer > StarterPlayerScripts)
-- Интерфейс: деньги, кнопки, магазин, улучшения, коллекция, коды, перерождение,
-- подписи над клиентами, перевод подсказок, луч к своему барбершопу. Язык RU/EN по настройкам игрока.

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local MPS = game:GetService("MarketplaceService")

local C = require(RS:WaitForChild("Config"))
local Net = RS:WaitForChild("Net")
local LP = Players.LocalPlayer
local RU = string.sub(string.lower(LP.LocaleId or ""), 1, 2) == "ru"

local TX = {
	ru = {
		buy = "Купить", cut = "Подстричь", sell = "Продать", steal = "Украсть", takeback = "Отобрать", lock = "Закрыть дверь",
		noMoney = "Не хватает денег", handsFull = "Руки заняты: сначала отнеси клиента",
		noSeat = "Нет свободных кресел. Купи кресло или продай клиента", placed = "Клиент сел в кресло! Подстриги его",
		stealOk = "Украдено! Клиент теперь твой", stealFail = "Клиента отобрали",
		stolen = "%s украл твоего клиента!", beingStolen = "%s уводит твоего клиента! Догони и нажми «Отобрать»",
		returned = "Клиент вернулся на место", locked = "Дверь закрыта, подожди",
		lockOn = "Дверь закрыта на %s сек", collect = "+$%s", cutRes = "Мутация: %s! Доход x%s",
		cutNone = "Стрижка готова. Мутация не выпала", sold = "Продано за $%s",
		offline = "Пока тебя не было, касса набрала $%s", nosave = "Сохранение недоступно: прогресс не сохранится",
		upgraded = "Улучшено!", maxed = "Уже максимум", rebirthed = "Перерождение! Доход навсегда x%s",
		rebirthNo = "Для перерождения нужно $%s", codeOk = "Код активирован!", codeBad = "Нет такого кода",
		codeUsed = "Код уже использован", thanks = "Спасибо за покупку!", paidRush = "%s включил Час пик для всего сервера!",
		carryDrop = "Клиент вернулся в твой барбершоп", refund = "Клиент ушёл, деньги вернулись",
		luckOn = "Удача x3 на 10 минут!", cash = "Начислено $%s",
		fuse = "Скрестить", trim = "Срезать причёску",
		fuseSel = "Выбран: %s. Теперь нажми «Скрестить» на втором клиенте", fused = "Новый гибрид: %s!", fuseCancel = "Скрещивание отменено",
		trimOk = "Срезал чужую причёску: +$%s", trimmed = "%s срезал причёску твоему клиенту!",
		shaveOk = "Ты побрил %s налысо!", shaved = "%s побрил тебя налысо!", shaveImmune = "%s недавно побрили, волосы ещё не отросли",
		bossDown = "%s добил Йети и забрал его себе!", bossLeft = "Йети ушёл нестриженым", bossReward = "Награда за Йети: +$%s",
		bald = "ЛЫСЫЙ", yeti = "ЙЕТИ", hybrid = "Гибрид", hybrids = "Гибриды: %s из %s",
		perSec = "+$%s/сек", shop = "Магазин", upgrades = "Улучшения", index = "Коллекция", codes = "Коды",
		rebirth = "Перерождение", chairs = "Кресла", chairsD = "Сейчас %s. Больше кресел, больше клиентов",
		lockT = "Дверь", lockD = "Защита от воров: %s сек", priceBtn = "$%s", max = "Максимум",
		passes = "Навсегда", products = "Разово", soon = "Покупки появятся скоро",
		enter = "Введи код", redeem = "Активировать",
		rebD = "Сбрасывает деньги и клиентов. Кресла и дверь остаются.\nДоход навсегда: x%s → x%s",
		rebBtn = "Переродиться за $%s", owned = "Куплено", robux = "Купить", found = "Найдено %s из %s",
		hint = "Купи клиента на улице и отнеси к себе. Скрещивай клиентов, расти им причёски, а воров брей машинкой ✂",
		carryHint = "Неси клиента в свой барбершоп", luckLeft = "Удача x3: %s", amount = "+$%s",
	},
	en = {
		buy = "Buy", cut = "Haircut", sell = "Sell", steal = "Steal", takeback = "Take back", lock = "Lock door",
		noMoney = "Not enough cash", handsFull = "Hands full: drop off your client first",
		noSeat = "No free chairs. Buy a chair or sell a client", placed = "Client is seated! Give them a haircut",
		stealOk = "Stolen! The client is yours now", stealFail = "The client was taken back",
		stolen = "%s stole your client!", beingStolen = "%s is stealing your client! Catch them and press Take back",
		returned = "Client is back in the chair", locked = "The door is locked, wait",
		lockOn = "Door locked for %s s", collect = "+$%s", cutRes = "Mutation: %s! Income x%s",
		cutNone = "Haircut done. No mutation this time", sold = "Sold for $%s",
		offline = "While you were away the till made $%s", nosave = "Saving is unavailable: progress will not be saved",
		upgraded = "Upgraded!", maxed = "Already maxed", rebirthed = "Rebirth! Income forever x%s",
		rebirthNo = "You need $%s to rebirth", codeOk = "Code redeemed!", codeBad = "No such code",
		codeUsed = "Code already used", thanks = "Thanks for the purchase!", paidRush = "%s started Rush Hour for the whole server!",
		carryDrop = "The client went back to your shop", refund = "The client left, cash refunded",
		luckOn = "3x Luck for 10 minutes!", cash = "Added $%s",
		fuse = "Fuse", trim = "Trim hair",
		fuseSel = "Selected: %s. Now press Fuse on a second client", fused = "New hybrid: %s!", fuseCancel = "Fusion cancelled",
		trimOk = "You trimmed someone's hair: +$%s", trimmed = "%s trimmed your client's hair!",
		shaveOk = "You shaved %s bald!", shaved = "%s shaved you bald!", shaveImmune = "%s was shaved recently, no hair left yet",
		bossDown = "%s finished the Yeti and took him home!", bossLeft = "The Yeti left unshaved", bossReward = "Yeti reward: +$%s",
		bald = "BALD", yeti = "YETI", hybrid = "Hybrid", hybrids = "Hybrids: %s of %s",
		perSec = "+$%s/s", shop = "Shop", upgrades = "Upgrades", index = "Collection", codes = "Codes",
		rebirth = "Rebirth", chairs = "Chairs", chairsD = "Now %s. More chairs, more clients",
		lockT = "Door", lockD = "Thief protection: %s s", priceBtn = "$%s", max = "Max",
		passes = "Forever", products = "One-time", soon = "Purchases coming soon",
		enter = "Enter code", redeem = "Redeem",
		rebD = "Resets cash and clients. Chairs and door stay.\nIncome forever: x%s → x%s",
		rebBtn = "Rebirth for $%s", owned = "Owned", robux = "Buy", found = "Found %s of %s",
		hint = "Buy a client on the street and carry them home. Fuse clients, grow their hair, shave thieves with your clipper ✂",
		carryHint = "Carry the client to your shop", luckLeft = "3x Luck: %s", amount = "+$%s",
	},
}
local T = RU and TX.ru or TX.en
local function tr(k, ...)
	local s = T[k] or tostring(k)
	local n = select("#", ...)
	if n > 0 then
		local args = { ... }
		for i = 1, n do args[i] = tostring(args[i] == nil and "" or args[i]) end
		local ok, r = pcall(string.format, s, table.unpack(args))
		if ok then return r end
	end
	return s
end
local function nm(t) return RU and t.ru or t.en end

-- цвета интерфейса: тёмно-синий салон, кремовый, красный и синий как на барбер-шесте, зелёные деньги
local NAVY = Color3.fromRGB(24, 30, 52)
local NAVY2 = Color3.fromRGB(36, 44, 74)
local CREAM = Color3.fromRGB(252, 246, 232)
local RED = Color3.fromRGB(214, 48, 49)
local BLUE = Color3.fromRGB(32, 96, 200)
local MONEY = Color3.fromRGB(110, 235, 140)
local GOLD = Color3.fromRGB(255, 200, 60)
local NUMF = Enum.Font.FredokaOne
local TXTF = RU and Enum.Font.GothamBold or Enum.Font.FredokaOne
local BODYF = Enum.Font.GothamMedium

local function new(class, props, parent)
	local o = Instance.new(class)
	for k, v in pairs(props) do o[k] = v end
	if parent then o.Parent = parent end
	return o
end
local function corner(o, r) new("UICorner", { CornerRadius = UDim.new(0, r or 12) }, o) end
local function stroke(o, th, col) return new("UIStroke", { Thickness = th or 2, Color = col or Color3.fromRGB(10, 12, 20) }, o) end
local function label(parent, props)
	local t = new("TextLabel", { BackgroundTransparency = 1, TextColor3 = CREAM, Font = TXTF, TextScaled = true, Text = "" }, parent)
	for k, v in pairs(props or {}) do t[k] = v end
	return t
end

local gui = new("ScreenGui", { Name = "BarberUI", ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling }, LP:WaitForChild("PlayerGui"))

local St = { cash = 0, ips = 0, reb = 0, chairs = C.BaseChairs, vip = 0, lock = 0, idx = {}, pass = {}, luck = 0, cash1 = 0, cash2 = 0 }

---------------------------------------------------------------- деньги
local money = new("Frame", { BackgroundColor3 = NAVY, Position = UDim2.new(0, 10, 0, 8), Size = UDim2.fromOffset(210, 78) }, gui)
corner(money, 16)
stroke(money, 3, Color3.fromRGB(10, 12, 20))
local cashL = label(money, { Font = NUMF, TextColor3 = MONEY, Position = UDim2.fromOffset(12, 6), Size = UDim2.new(1, -24, 0, 40), TextXAlignment = Enum.TextXAlignment.Left })
stroke(cashL, 2)
local ipsL = label(money, { Font = NUMF, Position = UDim2.fromOffset(12, 46), Size = UDim2.new(0.62, -12, 0, 24), TextXAlignment = Enum.TextXAlignment.Left })
local rebL = label(money, { Font = NUMF, TextColor3 = GOLD, Position = UDim2.new(0.62, 0, 0, 46), Size = UDim2.new(0.38, -12, 0, 24), TextXAlignment = Enum.TextXAlignment.Right })
local luckL = label(gui, { Font = NUMF, TextColor3 = GOLD, Position = UDim2.new(0, 14, 0, 90), Size = UDim2.fromOffset(200, 22), TextXAlignment = Enum.TextXAlignment.Left, Visible = false })
stroke(luckL, 2)

---------------------------------------------------------------- тосты и событие
local toasts = new("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 64), Size = UDim2.new(0.9, 0, 0, 200) }, gui)
new("UIListLayout", { Padding = UDim.new(0, 6), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, toasts)
new("UISizeConstraint", { MaxSize = Vector2.new(520, 200) }, toasts)
local tN = 0
local function toast(text, color, life)
	tN = tN + 1
	local f = new("Frame", { BackgroundColor3 = NAVY, BackgroundTransparency = 0.1, Size = UDim2.new(1, 0, 0, 38), LayoutOrder = tN }, toasts)
	corner(f, 12)
	local s = stroke(f, 2, color or BLUE)
	local t = label(f, { Text = text, TextColor3 = CREAM, Font = TXTF, Position = UDim2.fromOffset(12, 5), Size = UDim2.new(1, -24, 1, -10) })
	local kids = 0
	for _, c in ipairs(toasts:GetChildren()) do
		if c:IsA("Frame") then kids = kids + 1 end
	end
	if kids > 4 then
		for _, c in ipairs(toasts:GetChildren()) do
			if c:IsA("Frame") and c ~= f then c:Destroy() break end
		end
	end
	task.delay(life or 3, function()
		if not f.Parent then return end
		local ti = TweenInfo.new(0.4)
		TweenService:Create(f, ti, { BackgroundTransparency = 1 }):Play()
		TweenService:Create(t, ti, { TextTransparency = 1 }):Play()
		TweenService:Create(s, ti, { Transparency = 1 }):Play()
		task.wait(0.45)
		f:Destroy()
	end)
end

local evF = new("Frame", { BackgroundColor3 = RED, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 8), Size = UDim2.new(0.7, 0, 0, 48), Visible = false }, gui)
corner(evF, 14)
stroke(evF, 3)
new("UISizeConstraint", { MaxSize = Vector2.new(560, 48) }, evF)
local evL = label(evF, { Position = UDim2.fromOffset(12, 6), Size = UDim2.new(1, -84, 1, -12), TextXAlignment = Enum.TextXAlignment.Left })
local evT = label(evF, { Font = NUMF, Position = UDim2.new(1, -70, 0, 6), Size = UDim2.new(0, 60, 1, -12), TextXAlignment = Enum.TextXAlignment.Right })
local evEnds = 0

---------------------------------------------------------------- панели
local dim = new("TextButton", { Text = "", AutoButtonColor = false, BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 5 }, gui)
local panel = new("Frame", { BackgroundColor3 = NAVY, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromScale(0.92, 0.78), Visible = false, ZIndex = 6 }, gui)
corner(panel, 20)
stroke(panel, 4, Color3.fromRGB(10, 12, 20))
new("UISizeConstraint", { MaxSize = Vector2.new(560, 600) }, panel)
local stripe = new("Frame", { BackgroundColor3 = RED, Size = UDim2.new(1, 0, 0, 58), ZIndex = 6 }, panel)
corner(stripe, 20)
new("Frame", { BackgroundColor3 = RED, BorderSizePixel = 0, Position = UDim2.new(0, 0, 1, -20), Size = UDim2.new(1, 0, 0, 20), ZIndex = 6 }, stripe)
local titleL = label(stripe, { Position = UDim2.fromOffset(18, 10), Size = UDim2.new(1, -90, 1, -20), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7 })
stroke(titleL, 2)
local closeB = new("TextButton", { Text = "✕", Font = NUMF, TextScaled = true, TextColor3 = CREAM, BackgroundColor3 = NAVY, Position = UDim2.new(1, -54, 0, 9), Size = UDim2.fromOffset(42, 40), ZIndex = 7 }, stripe)
corner(closeB, 12)
local body = new("ScrollingFrame", { BackgroundTransparency = 1, BorderSizePixel = 0, Position = UDim2.fromOffset(14, 70), Size = UDim2.new(1, -28, 1, -84), ScrollBarThickness = 6, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), ZIndex = 6 }, panel)

local openKind = nil
local lastIdx = -1
local renderers = {}
local function clearBody()
	for _, c in ipairs(body:GetChildren()) do c:Destroy() end
end
local function render()
	if not openKind then return end
	local y = body.CanvasPosition
	clearBody()
	renderers[openKind]()
	body.CanvasPosition = y
end
local function openPanel(kind)
	if openKind == kind then
		openKind = nil
		panel.Visible = false
		dim.Visible = false
		return
	end
	openKind = kind
	titleL.Text = tr(kind)
	panel.Visible = true
	dim.Visible = true
	body.CanvasPosition = Vector2.new()
	render()
end
local function closePanel()
	openKind = nil
	panel.Visible = false
	dim.Visible = false
end
closeB.Activated:Connect(closePanel)
dim.Activated:Connect(closePanel)

local function list()
	new("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, body)
end
local function row(order, title, desc, btnText, btnColor, onClick, disabled)
	local f = new("Frame", { BackgroundColor3 = NAVY2, Size = UDim2.new(1, -8, 0, 86), LayoutOrder = order, ZIndex = 6 }, body)
	corner(f, 14)
	label(f, { Text = title, Position = UDim2.fromOffset(14, 10), Size = UDim2.new(1, -170, 0, 28), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7 })
	label(f, { Text = desc, Font = BODYF, TextColor3 = Color3.fromRGB(200, 205, 225), Position = UDim2.fromOffset(14, 42), Size = UDim2.new(1, -170, 0, 34), TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, TextWrapped = true, ZIndex = 7 })
	local b = new("TextButton", { Text = btnText, Font = NUMF, TextScaled = true, TextColor3 = CREAM, BackgroundColor3 = disabled and Color3.fromRGB(80, 86, 110) or (btnColor or BLUE), AutoButtonColor = not disabled, Position = UDim2.new(1, -150, 0.5, -24), Size = UDim2.fromOffset(138, 48), ZIndex = 7 }, f)
	corner(b, 12)
	stroke(b, 2)
	new("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8), PaddingTop = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8) }, b)
	if not disabled and onClick then b.Activated:Connect(onClick) end
	return f
end
local function heading(order, text)
	label(body, { Text = text, TextColor3 = GOLD, Size = UDim2.new(1, -8, 0, 26), TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = order, ZIndex = 7 })
end

renderers.shop = function()
	list()
	local any = false
	heading(1, tr("passes"))
	for i, g in ipairs(C.Passes) do
		if g.id ~= 0 then
			any = true
			local own = St.pass[g.key]
			row(1 + i, nm(g), RU and g.dru or g.den, own and tr("owned") or tr("robux"), GOLD, function()
				MPS:PromptGamePassPurchase(LP, g.id)
			end, own)
		end
	end
	heading(10, tr("products"))
	for i, pr in ipairs(C.Products) do
		if pr.id ~= 0 then
			any = true
			local desc = RU and pr.dru or pr.den
			if pr.key == "cash1" or pr.key == "cash2" then desc = desc .. ": " .. tr("amount", C.fmt(St[pr.key] or 0)) end
			row(10 + i, nm(pr), desc, tr("robux"), GOLD, function()
				MPS:PromptProductPurchase(LP, pr.id)
			end)
		end
	end
	if not any then
		for _, c in ipairs(body:GetChildren()) do
			if c:IsA("TextLabel") then c:Destroy() end
		end
		label(body, { Text = tr("soon"), Size = UDim2.new(1, -8, 0, 40), ZIndex = 7 })
	end
end

renderers.upgrades = function()
	list()
	local maxed = St.chairs >= C.MaxChairs
	local cost = C.chairCost(St.chairs)
	row(1, tr("chairs") .. "  " .. (St.chairs + (St.vip or 0)), tr("chairsD", St.chairs + (St.vip or 0)),
		maxed and tr("max") or tr("priceBtn", C.fmt(cost)), St.cash >= cost and Color3.fromRGB(40, 160, 80) or BLUE,
		function() Net:FireServer("upgrade", "chairs") end, maxed)
	local lmax = St.lock >= C.MaxLock
	local lcost = C.lockCost(St.lock)
	row(2, tr("lockT") .. "  " .. (St.lock + 1) .. "/" .. (C.MaxLock + 1), tr("lockD", C.lockDur(St.lock)),
		lmax and tr("max") or tr("priceBtn", C.fmt(lcost)), St.cash >= lcost and Color3.fromRGB(40, 160, 80) or BLUE,
		function() Net:FireServer("upgrade", "lock") end, lmax)
end

renderers.rebirth = function()
	list()
	local cost = C.rebirthCost(St.reb)
	label(body, { Text = tr("rebD", tostring(C.rebirthMult(St.reb)), tostring(C.rebirthMult(St.reb + 1))), Font = BODYF, TextScaled = false, TextSize = 18, TextWrapped = true, Size = UDim2.new(1, -8, 0, 70), LayoutOrder = 1, ZIndex = 7 })
	row(2, tr("rebirth") .. " " .. (St.reb + 1), "x" .. C.rebirthMult(St.reb) .. " → x" .. C.rebirthMult(St.reb + 1),
		tr("priceBtn", C.fmt(cost)), St.cash >= cost and RED or BLUE, function() Net:FireServer("rebirth") closePanel() end, St.cash < cost)
end

renderers.codes = function()
	list()
	local box = new("TextBox", { PlaceholderText = tr("enter"), Text = "", Font = NUMF, TextScaled = true, TextColor3 = NAVY, PlaceholderColor3 = Color3.fromRGB(140, 140, 150), BackgroundColor3 = CREAM, ClearTextOnFocus = false, Size = UDim2.new(1, -8, 0, 54), LayoutOrder = 1, ZIndex = 7 }, body)
	corner(box, 12)
	new("UIPadding", { PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12), PaddingTop = UDim.new(0, 10), PaddingBottom = UDim.new(0, 10) }, box)
	local b = new("TextButton", { Text = tr("redeem"), Font = TXTF, TextScaled = true, TextColor3 = CREAM, BackgroundColor3 = RED, Size = UDim2.new(1, -8, 0, 54), LayoutOrder = 2, ZIndex = 7 }, body)
	corner(b, 12)
	stroke(b, 2)
	new("UIPadding", { PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 12) }, b)
	b.Activated:Connect(function()
		if box.Text ~= "" then Net:FireServer("code", box.Text) end
	end)
end

renderers.index = function()
	lastIdx = 0
	for _ in pairs(St.idx or {}) do lastIdx = lastIdx + 1 end
	local total, found = #C.Clients, 0
	for cid in ipairs(C.Clients) do
		if St.idx[tostring(cid)] then found = found + 1 end
	end
	label(body, { Text = tr("found", found, total), TextColor3 = GOLD, Size = UDim2.new(1, -8, 0, 26), LayoutOrder = 0, ZIndex = 7 })
	local grid = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, -8, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 10, ZIndex = 6 }, body)
	new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, body)
	new("UIGridLayout", { CellSize = UDim2.fromOffset(118, 92), CellPadding = UDim2.fromOffset(8, 8), SortOrder = Enum.SortOrder.LayoutOrder }, grid)
	local hyb, hybN = {}, 0
	for k in pairs(St.idx) do
		local x, y = string.match(k, "^h:(%d+):(%d+)$")
		if x then
			hybN = hybN + 1
			table.insert(hyb, C.name(tonumber(x), tonumber(y), RU))
		end
	end
	table.sort(hyb)
	label(body, { Text = tr("hybrids", hybN, total * total), TextColor3 = Color3.fromRGB(120, 255, 160), Size = UDim2.new(1, -8, 0, 26), LayoutOrder = 2, ZIndex = 7 })
	if hybN > 0 then
		label(body, { Text = table.concat(hyb, ", "), Font = BODYF, TextScaled = false, TextSize = 16, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, AutomaticSize = Enum.AutomaticSize.Y, Size = UDim2.new(1, -8, 0, 20), LayoutOrder = 3, ZIndex = 7 })
	end
	for cid, d in ipairs(C.Clients) do
		local rar = C.Rarities[d.r]
		local has = St.idx[tostring(cid)]
		local f = new("Frame", { BackgroundColor3 = has and NAVY2 or Color3.fromRGB(30, 34, 50), LayoutOrder = cid, ZIndex = 7 }, grid)
		corner(f, 12)
		stroke(f, 3, rar.color)
		label(f, { Text = has and nm(d) or "???", Position = UDim2.fromOffset(6, 8), Size = UDim2.new(1, -12, 0, 36), TextWrapped = true, ZIndex = 8, TextColor3 = has and CREAM or Color3.fromRGB(120, 124, 140) })
		label(f, { Text = nm(rar), Font = BODYF, TextColor3 = rar.color, Position = UDim2.fromOffset(6, 46), Size = UDim2.new(1, -12, 0, 16), ZIndex = 8 })
		for j, mk in ipairs(C.MutOrder) do
			local on = St.idx[cid .. ":" .. mk]
			local dot = new("Frame", { BackgroundColor3 = C.Mutations[mk].color, BackgroundTransparency = on and 0 or 0.8, Position = UDim2.new(0, 10 + (j - 1) * 20, 0, 68), Size = UDim2.fromOffset(14, 14), ZIndex = 8 }, f)
			corner(dot, 7)
		end
	end
end

---------------------------------------------------------------- кнопки слева
local side = new("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0, 0.5), Position = UDim2.new(0, 10, 0.55, 0), Size = UDim2.fromOffset(74, 5 * 82) }, gui)
new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, side)
local BTN = {
	{ "shop", "🛒", GOLD }, { "upgrades", "⬆", Color3.fromRGB(40, 160, 80) }, { "index", "📖", BLUE },
	{ "codes", "🎁", Color3.fromRGB(170, 90, 230) }, { "rebirth", "♻", RED },
}
for i, b in ipairs(BTN) do
	local btn = new("TextButton", { Text = "", BackgroundColor3 = b[3], Size = UDim2.fromOffset(74, 74), LayoutOrder = i }, side)
	corner(btn, 18)
	stroke(btn, 3)
	label(btn, { Text = b[2], Font = NUMF, Position = UDim2.fromOffset(8, 6), Size = UDim2.new(1, -16, 0, 40) })
	local cap = label(btn, { Text = tr(b[1]), Position = UDim2.new(0, 4, 1, -24), Size = UDim2.new(1, -8, 0, 18) })
	stroke(cap, 1.5)
	btn.Activated:Connect(function() openPanel(b[1]) end)
end

---------------------------------------------------------------- данные с сервера
local carryL = label(gui, { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -24), Size = UDim2.new(0.8, 0, 0, 34), TextColor3 = MONEY, Visible = false })
stroke(carryL, 2)
new("UISizeConstraint", { MaxSize = Vector2.new(520, 34) }, carryL)

local function refreshHUD()
	cashL.Text = "$" .. C.fmt(St.cash)
	ipsL.Text = tr("perSec", C.fmt(St.ips))
	rebL.Text = St.reb > 0 and ("♻ x" .. C.rebirthMult(St.reb)) or ""
	carryL.Text = tr("carryHint")
	carryL.Visible = St.carry ~= nil
end

local SND = new("Sound", { SoundId = "rbxasset://sounds/electronicpingshort.wav", Volume = 0.5 }, gui)
Net.OnClientEvent:Connect(function(kind, a, b, c)
	if kind == "state" then
		St = a
		refreshHUD()
		if openKind == "upgrades" or openKind == "rebirth" or openKind == "shop" then
			render()
		elseif openKind == "index" then
			local n = 0
			for _ in pairs(St.idx or {}) do n = n + 1 end
			if n ~= lastIdx then render() end
		end
	elseif kind == "toast" then
		local col = BLUE
		if a == "cutRes" then
			b = nm(C.Mutations[b] or C.Mutations.none)
			col = GOLD
		elseif a == "fuseSel" then
			b = C.name(b, nil, RU)
		elseif a == "fused" then
			b = C.name(b, c, RU)
			col = MONEY
		elseif a == "shaveOk" or a == "trimOk" or a == "bossReward" or a == "bossDown" then
			col = MONEY
		elseif a == "shaved" or a == "trimmed" then
			col = RED
		elseif a == "collect" or a == "sold" or a == "cash" or a == "stealOk" or a == "placed" then
			col = MONEY
		elseif a == "stolen" or a == "beingStolen" or a == "noMoney" or a == "locked" or a == "stealFail" then
			col = RED
		end
		toast(tr(a, b, c), col, (a == "offline" or a == "beingStolen") and 5 or 3)
		if a == "collect" or a == "sold" or a == "cutRes" then SND:Play() end
	elseif kind == "event" then
		if a and C.Events[a] then
			evEnds = b
			evL.Text = nm(C.Events[a])
			evF.BackgroundColor3 = (a == "balm") and BLUE or ((a == "star") and Color3.fromRGB(150, 80, 230) or RED)
			evF.Visible = true
		else
			evF.Visible = false
		end
	end
end)

---------------------------------------------------------------- подписи над клиентами
local Clients = workspace:WaitForChild("Clients")
local rainbow = {}

local function decorate(m)
	local root = m:WaitForChild("Root", 5)
	local cid = m:GetAttribute("Cid")
	local cid2 = m:GetAttribute("Cid2")
	local d = cid and C.Clients[cid]
	if not root or not d or (cid2 and not C.Clients[cid2]) then return end
	local _, inc, r = C.stats(cid, cid2)
	local rar = C.Rarities[r]
	local s = cid2 and (((d.scale or 1) + (C.Clients[cid2].scale or 1)) / 2) or (d.scale or 1)
	local bb = new("BillboardGui", { Name = "Tag", Size = UDim2.fromOffset(220, 76), StudsOffset = Vector3.new(0, 3.9 * s + 1.4, 0), MaxDistance = 70, LightInfluence = 0, Adornee = root }, root)
	local nameL = label(bb, { Text = C.name(cid, cid2, RU), Font = TXTF, TextColor3 = rar.color, Size = UDim2.new(1, 0, 0, 28) })
	stroke(nameL, 2)
	if r == 6 then
		new("UIGradient", { Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 80, 80)), ColorSequenceKeypoint.new(0.33, Color3.fromRGB(255, 230, 80)),
			ColorSequenceKeypoint.new(0.66, Color3.fromRGB(80, 220, 255)), ColorSequenceKeypoint.new(1, Color3.fromRGB(220, 90, 255)) }) }, nameL)
	end
	local midL = label(bb, { Font = TXTF, Position = UDim2.fromOffset(0, 28), Size = UDim2.new(1, 0, 0, 20) })
	stroke(midL, 1.5)
	local lowL = label(bb, { Font = NUMF, Position = UDim2.fromOffset(0, 48), Size = UDim2.new(1, 0, 0, 26) })
	stroke(lowL, 2)
	local function upd()
		local mut = m:GetAttribute("Mut") or "none"
		local md = C.Mutations[mut] or C.Mutations.none
		local state = m:GetAttribute("State")
		local g = m:GetAttribute("Grow") or 0
		bb.StudsOffset = Vector3.new(0, 3.9 * s + 1.4 + g * 0.45 * s, 0)
		midL.Text = (mut ~= "none" and (nm(md) .. " · ") or "") .. (cid2 and (tr("hybrid") .. " · ") or "") .. nm(rar)
		midL.TextColor3 = mut ~= "none" and md.color or Color3.fromRGB(220, 224, 236)
		if state == "street" then
			lowL.Text = "$" .. C.fmt(m:GetAttribute("Price") or d.price)
			lowL.TextColor3 = GOLD
		elseif state == "seat" then
			lowL.Text = tr("perSec", C.fmt(inc * md.mult * C.growMult(g)))
			lowL.TextColor3 = MONEY
		else
			lowL.Text = ""
		end
		if mut == "rainbow" then rainbow[m] = true else rainbow[m] = nil end
	end
	upd()
	m.AttributeChanged:Connect(upd)
	m.AncestryChanged:Connect(function()
		if not m:IsDescendantOf(workspace) then rainbow[m] = nil end
	end)
end
Clients.ChildAdded:Connect(function(m) task.spawn(decorate, m) end)
for _, m in ipairs(Clients:GetChildren()) do task.spawn(decorate, m) end

---------------------------------------------------------------- перевод подсказок и кто их видит
local function fixPrompt(pp)
	local function upd()
		local k = pp:GetAttribute("K")
		if not k then return end
		local v = pp:GetAttribute("V")
		pp.ActionText = v and (tr(k) .. " $" .. tostring(v)) or tr(k)
		pp.ObjectText = ""
		local only, notU = pp:GetAttribute("Only"), pp:GetAttribute("Not")
		if only ~= nil then
			pp.Enabled = (only == LP.UserId)
		elseif notU ~= nil then
			pp.Enabled = (notU ~= LP.UserId)
		end
	end
	upd()
	pp.AttributeChanged:Connect(upd)
end
workspace.DescendantAdded:Connect(function(o)
	if o:IsA("ProximityPrompt") then
		fixPrompt(o)
	elseif o:IsA("TextLabel") and o:GetAttribute("L") then
		o.Text = tr(o:GetAttribute("L"))
	end
end)
for _, o in ipairs(workspace:GetDescendants()) do
	if o:IsA("TextLabel") and o:GetAttribute("L") then o.Text = tr(o:GetAttribute("L")) end
end
for _, o in ipairs(workspace:GetDescendants()) do
	if o:IsA("ProximityPrompt") then fixPrompt(o) end
end

---------------------------------------------------------------- луч к своему барбершопу, радуга, таймеры
local beam, a0
local acc = 0
RunService.RenderStepped:Connect(function(dt)
	local t = os.clock()
	for m in pairs(rainbow) do
		local col = Color3.fromHSV((t * 0.35) % 1, 0.75, 1)
		local hit = false
		for _, p in ipairs(m:GetChildren()) do
			if p.Name == "Hair" then
				p.Color = col
				hit = true
			end
		end
		if not hit and m:FindFirstChild("Head") then m.Head.Color = col end
	end
	acc = acc + dt
	if acc < 0.25 then return end
	acc = 0
	if evF.Visible then
		local left = math.max(0, math.floor(evEnds - workspace:GetServerTimeNow()))
		evT.Text = string.format("%d:%02d", math.floor(left / 60), left % 60)
	end
	luckL.Visible = (St.luck or 0) > 0
	if luckL.Visible then luckL.Text = tr("luckLeft", math.ceil(St.luck / 60) .. "m") end
	local char = LP.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	local pi = LP:GetAttribute("Plot")
	local map = workspace:FindFirstChild("Map")
	local plot = pi and map and map:FindFirstChild("Plot" .. pi)
	local home = plot and plot:FindFirstChild("Home")
	if St.carry and hrp and home and home:FindFirstChild("A") then
		if not beam or not beam.Parent or beam.Parent ~= hrp then
			a0 = new("Attachment", { Name = "BeamA" }, hrp)
			beam = new("Beam", { Attachment0 = a0, Attachment1 = home.A, Color = ColorSequence.new(MONEY), Width0 = 0.8, Width1 = 0.8, FaceCamera = true, LightEmission = 1, Transparency = NumberSequence.new(0.3), Segments = 1 }, hrp)
		end
		beam.Enabled = true
	elseif beam then
		beam.Enabled = false
	end
end)

-- на маленьких экранах (телефон боком) уменьшаем кнопки и плашки
local scales = {}
for _, f in ipairs({ money, side, luckL, toasts, evF, carryL }) do
	table.insert(scales, new("UIScale", {}, f))
end
local function rescale()
	local y = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.Y or 720
	local k = math.clamp(y / 700, 0.55, 1)
	for _, u in ipairs(scales) do u.Scale = k end
end
rescale()
if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale) end

refreshHUD()
toast(tr("hint"), GOLD, 9)
Net:FireServer("ready")
