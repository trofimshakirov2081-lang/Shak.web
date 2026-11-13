-- Прогон серверной логики по сценариям
local fails, passes = {}, 0
local function check(cond, msg)
	if cond then passes = passes + 1 else table.insert(fails, msg) print("  FAIL: " .. msg) end
end
local function section(n) print("== " .. n) end

-- сообщения клиентам
local last = {}
M.fireClient = function(p, kind, a, b, c)
	table.insert(E.msgs[p], { kind, a, b, c })
	if kind == "state" then last[p] = a end
end
M.fireAll = function(kind, a, b, c)
	for _, p in ipairs(E.Players:GetPlayers()) do M.fireClient(p, kind, a, b, c) end
end
local function toasts(p)
	local t = {}
	for _, m in ipairs(E.msgs[p]) do if m[1] == "toast" then table.insert(t, m[2]) end end
	return t
end
local function hadToast(p, key)
	for _, m in ipairs(E.msgs[p]) do if m[1] == "toast" and m[2] == key then return m end end
	return nil
end
local function clearMsgs(p) E.msgs[p] = {} end

-- конфиг с ID покупок, чтобы проверить покупки
local realRequire = require
local cfgFn = assert(load(CONFIG_SRC, "Config"))
local C = cfgFn()
for i, g in ipairs(C.Passes) do g.id = 200 + i end
for i, pr in ipairs(C.Products) do pr.id = 100 + i end
local RS = game:GetService("ReplicatedStorage")
local cfgInst = M.newInstance("ModuleScript")
cfgInst.Name = "Config"
cfgInst.__module = C
cfgInst.Parent = RS
require = function(x) if M.isInst(x) then return x.__module end return realRequire(x) end

section("загрузка сервера")
task.spawn(assert(load(SERVER_SRC, "GameServer")))
M.advance(10)
check(#M.errors == 0, "ошибки при загрузке")
local Net = RS:FindFirstChild("Net")
check(Net ~= nil, "нет RemoteEvent Net")
local Clients = workspace:FindFirstChild("Clients")
check(#Clients:GetChildren() >= 2, "на улице нет клиентов")
local Map = workspace:FindFirstChild("Map")

local function remote(p, kind, a) M.advance(0.3); Net.OnServerEvent:Fire(p, kind, a); M.advance(0.1) end
local function chat(p, msg) p.Chatted:Fire(msg); M.advance(0.1) end
local function promptOf(model, key)
	if not model or not model:FindFirstChild("Root") then return nil end
	for _, c in ipairs(model.Root:GetChildren()) do
		if c:IsA("ProximityPrompt") and c:GetAttribute("K") == key then return c end
	end
	return nil
end
local function trig(pp, p) assert(pp, "prompt missing"); pp.Triggered:Fire(p); M.advance(0.05) end
local function streetClient(cid)
	for _, m in ipairs(Clients:GetChildren()) do
		if m:GetAttribute("Cid") == cid and m:GetAttribute("State") == "street" then return m end
	end
end
local function seated(p)
	local t = {}
	for _, m in ipairs(Clients:GetChildren()) do
		if m:GetAttribute("State") == "seat" and m:GetAttribute("Owner") == p.UserId then table.insert(t, m) end
	end
	return t
end
local function home(p) return Map:FindFirstChild("Plot" .. p:GetAttribute("Plot")):FindFirstChild("Home").Position end
local function moveTo(p, pos, look)
	local hrp = p.Character.HumanoidRootPart
	hrp.CFrame = look and CFrame.lookAt(pos, look) or CFrame.new(pos)
end
local function goHome(p) moveTo(p, home(p)); M.advance(0.5) end
local function buy(p, cid)
	chat(p, "!spawn " .. cid)
	local m = streetClient(cid)
	trig(promptOf(m, "buy"), p)
	return m
end
local function steal(thief, m)
	moveTo(thief, m.Root.Position + Vector3.new(0, 0, -3))
	trig(promptOf(m, "steal"), thief)
end
local function cash(p) return last[p] and last[p].cash end


section("БЛОК 1. Настройки: цифры и формулы")
for cid, d in ipairs(C.Clients) do
	check(d.rp and d.rs and d.ep and d.es and d.ru and d.en, "у клиента " .. cid .. " нет частей имени")
	check(d.price > 0 and d.inc > 0 and C.Rarities[d.r], "у клиента " .. cid .. " плохие цифры")
	for _, st in ipairs(d.style) do
		local ok = ({short=1,pomp=1,mohawk=1,afro=1,long=1,bun=1,beard=1,spikes=1,spikesBig=1,ears=1,antenna=1,bald=1,crown=1,helmet=1})[st]
		check(ok, "неизвестная причёска " .. st)
	end
end
for r = 1, 6 do
	local any = false
	for _, d in ipairs(C.Clients) do if d.r == r and not d.boss then any = true end end
	check(any, "в редкости " .. r .. " нет клиентов для улицы")
end
check(C.fmt(999) == "999" and C.fmt(1000) == "1K" and C.fmt(1234567) == "1.23M" and C.fmt(150000) == "150K" and C.fmt(10500) == "10.5K", "формат чисел: " .. C.fmt(1000) .. " " .. C.fmt(1234567) .. " " .. C.fmt(10500))
check(C.fmt(1e18):sub(-2) == "Qi", "формат больших чисел: " .. C.fmt(1e18))
local prevPay = 0
for cid, d in ipairs(C.Clients) do
	if not d.boss then
		local pay = d.price / d.inc
		check(pay >= prevPay - 0.01, "окупаемость падает у клиента " .. cid .. " (" .. pay .. " < " .. prevPay .. ")")
		prevPay = pay
	end
end
check(C.chairCost(C.MaxChairs - 1) > C.chairCost(C.BaseChairs), "цена кресел не растёт")
local sumCut = 0
for _, k in ipairs(C.CutOrder) do sumCut = sumCut + C.Mutations[k].chance end
print("  справка: при удаче x6 (оба платных бонуса) мутация гарантирована, сумма шансов " .. sumCut * 6)
local names = {}
for a = 1, #C.Clients do for b = 1, #C.Clients do
	local n = C.name(a, b, true)
	names[n] = (names[n] or 0) + 1
end end
local dup = 0
for n, k in pairs(names) do if k > 1 then dup = dup + 1 end end
print("  одинаковых имён гибридов: " .. dup)

section("БЛОК 2. Карта: всё внутри своих границ")
local Map = workspace.Map
for i = 1, 6 do
	local pl = Map:FindFirstChild("Plot" .. i)
	check(pl ~= nil, "нет участка " .. i)
end
local home1 = Map.Plot1.Home.Position
check(math.abs(home1.Z) > 14, "точка дома не внутри участка")

section("БЛОК 3. Покупка: гонка двух игроков")
local A = E.join("Alice", 1); local B = E.join("Bob", 2)
M.advance(1); remote(A, "ready"); remote(B, "ready")
chat(A, "!cash 100000"); chat(B, "!cash 100000")
chat(A, "!spawn 5")
local m = streetClient(5)
local pp = promptOf(m, "buy")
pp.Triggered:Fire(A); pp.Triggered:Fire(B); M.advance(0.1)
local ca, cb = cash(A), cash(B)
check((ca == 100050 - 350) ~= (cb == 100050 - 350), "оба или никто не заплатили: A=" .. ca .. " B=" .. cb)
goHome(A); goHome(B)

section("БЛОК 4. Кресло вора: зарезервированное место жертвы")
-- A заполняет все 4 кресла
local own = seated(A)
while #own < 4 do buy(A, 1); goHome(A); own = seated(A) end
check(#own == 4, "A не заполнил 4 кресла")
local victimM = own[1]
steal(B, victimM)
check(victimM:GetAttribute("State") == "carried", "кража не началась")
clearMsgs(A)
buy(A, 1)
check(hadToast(A, "noSeat"), "жертва купила клиента в кресло, которое занято украденным")
-- B не довёз, A догоняет и отбирает
local tb
for _, c in ipairs(B.Character.HumanoidRootPart:GetChildren()) do if c:IsA("ProximityPrompt") then tb = c end end
trig(tb, A)
check(victimM:GetAttribute("Owner") == 1 and victimM:GetAttribute("State") == "seat", "не вернулся на своё место")

section("БЛОК 4. Вор без свободного кресла")
while #seated(B) < 4 do buy(B, 1); goHome(B) end
clearMsgs(B)
steal(B, victimM)
check(hadToast(B, "noSeat") and victimM:GetAttribute("State") == "seat", "вор без мест смог украсть")

section("БЛОК 4. Вор уходит из игры с чужим клиентом")
local sold = seated(B)[1]
trig(promptOf(sold, "sell"), B)
steal(B, victimM)
check(victimM:GetAttribute("State") == "carried", "кража не началась (2)")
E.leave(B)
M.advance(0.5)
check(victimM:GetAttribute("Owner") == 1 and victimM:GetAttribute("State") == "seat", "клиент не вернулся жертве после выхода вора")
B = E.join("Bob", 2); M.advance(1); remote(B, "ready")

section("БЛОК 4. Купил и вышел, не донеся")
chat(B, "!cash 0")
local cb0 = cash(B)
local held = buy(B, 6)
local paid = cb0 - cash(B)
E.leave(B); M.advance(0.5)
local saved = E.store["u_2"]
local kept = false
for _, x in ipairs(saved.seats) do if x.c == 6 then kept = true end end
check(kept or math.abs(saved.cash - cb0) < 1, "недонесённый клиент пропал без денег")
check(held.Parent == nil, "недонесённый клиент остался на карте")
B = E.join("Bob", 2); M.advance(1); remote(B, "ready")

section("БЛОК 5. Касса только для хозяина")
M.advance(5)
local cA0 = cash(A)
Map.Plot1.Kassa.Touched:Fire(B.Character.HumanoidRootPart); M.advance(0.1)
check(cash(B) == cash(B) and cash(A) == cA0, "чужой собрал кассу")

section("БЛОК 6. Скрещивание: причёска и мутация")
chat(A, "!grow")
local list = seated(A)
local a1, a2 = list[1], list[2]
local g1 = a1:GetAttribute("Grow")
trig(promptOf(a1, "fuse"), A); trig(promptOf(a2, "fuse"), A)
local h
for _, x in ipairs(seated(A)) do if x:GetAttribute("Cid2") then h = x end end
check(h and h:GetAttribute("Grow") == g1, "гибрид потерял рост причёски")
-- выбранного украли: выбор должен сброситься
trig(promptOf(seated(B)[1], "sell"), B)
local a3 = seated(A)[2]
if a3 == h then a3 = seated(A)[1] end
trig(promptOf(a3, "fuse"), A)
steal(B, a3)
check(a3:FindFirstChild("FuseHL") == nil, "подсветка выбора осталась на украденном")
local tb2
for _, c in ipairs(B.Character.HumanoidRootPart:GetChildren()) do if c:IsA("ProximityPrompt") then tb2 = c end end
if tb2 then trig(tb2, A) end

section("БЛОК 7. Бритьё: защита, со спины, после появления")
E.respawn(A); M.advance(0.5)
local apos = A.Character.HumanoidRootPart.Position
moveTo(B, apos + Vector3.new(0, 0, 4), apos)
B.Backpack:FindFirstChild("Clipper ✂").Activated:Fire(); M.advance(0.2)
check(A.Character:FindFirstChild("Hat1") ~= nil, "побрили сразу после появления")
M.advance(11)
moveTo(B, apos + Vector3.new(0, 0, 6), apos + Vector3.new(0, 0, 20)) -- отвернулся
B.Backpack:FindFirstChild("Clipper ✂").Activated:Fire(); M.advance(0.2)
check(A.Character:FindFirstChild("Hat1") ~= nil, "побрил спиной")

section("БЛОК 8. Босс: один игрок успевает")
for _, p in ipairs({ B }) do E.leave(p) end
M.advance(1)
chat(A, "!event boss")
moveTo(A, Vector3.new(6, 3, 0), Vector3.new(0, 3, 0))
local t0 = M.now()
for i = 1, 200 do
	if not workspace.Map:FindFirstChild("Boss") then break end
	A.Backpack:FindFirstChild("Clipper ✂").Activated:Fire()
	M.advance(1.25)
end
check(workspace.Map:FindFirstChild("Boss") == nil, "один игрок не победил Йети")
check(M.now() - t0 < C.Events.boss.dur, "один игрок не успевает: " .. (M.now() - t0) .. " сек")
print("  соло-победа над Йети за " .. math.floor(M.now() - t0) .. " сек")

section("БЛОК 9. Админ-команды недоступны обычным игрокам")
E.studio = false
local c0 = cash(A)
chat(A, "!cash 999999")
check(cash(A) == c0, "обычный игрок дал себе денег командой")
E.studio = true

section("БЛОК 10. VIP-пропуск сразу даёт кресла")
local ch0 = 0
for _, x in ipairs(Map.Plot1:GetChildren()) do if x:IsA("Part") and x.Transparency == 0.85 then ch0 = ch0 + 1 end end
game:GetService("MarketplaceService").PromptGamePassPurchaseFinished:Fire(A, 203, true)
M.advance(0.2)
check(last[A].vip == 2, "VIP не засчитан")
local ch1 = 0
for _, x in ipairs(Map.Plot1:GetChildren()) do if x:IsA("Part") and x.Transparency == 0.85 then ch1 = ch1 + 1 end end
check(ch1 < ch0, "VIP-кресла не появились")

section("БЛОК 11. Автосохранение")
local s0 = E.saves or 0
M.advance(100)
check((E.saves or 0) > s0, "нет автосохранения за 100 сек")

section("БЛОК 11. Причёска сохраняется")
chat(A, "!grow")
E.leave(A); M.advance(0.5)
local mx = 0
for _, s in ipairs(E.store["u_1"].seats) do mx = math.max(mx, s.g or 0) end
check(mx == C.GrowMax, "рост причёски не сохранился")

print("")
print("ОШИБКИ ВЫПОЛНЕНИЯ: " .. #M.errors)
for i, e in ipairs(M.errors) do if i <= 6 then print(e) end end
print("ПРОВЕРОК ПРОЙДЕНО: " .. passes .. ", НЕ ПРОЙДЕНО: " .. #fails)
