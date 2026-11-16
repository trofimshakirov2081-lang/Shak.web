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

section("вход игрока A")
local A = E.join("Alice", 1)
M.advance(1)
check(A:GetAttribute("Plot") == 1, "A не получил участок 1")
check(A.Backpack:FindFirstChild("Clipper ✂") ~= nil, "нет машинки в рюкзаке")
remote(A, "ready")
check(cash(A) == 50, "стартовые деньги не 50: " .. tostring(cash(A)))
check(A.leaderstats.Cash.Value == 50, "leaderstats Cash не 50")

section("покупка и доставка")
local m1 = buy(A, 1)
check(m1:GetAttribute("State") == "carried", "клиент не в руках после покупки")
check(cash(A) == 35, "после покупки за 15 денег не 35: " .. tostring(cash(A)))
local m2 = streetClient(2) or (function() chat(A, "!spawn 2") return streetClient(2) end)()
trig(promptOf(m2, "buy"), A)
check(hadToast(A, "handsFull"), "можно купить второго, когда руки заняты")
goHome(A)
check(m1:GetAttribute("State") == "seat", "клиент не сел в кресло дома")
check(hadToast(A, "placed"), "нет сообщения placed")

section("стрижка")
trig(promptOf(m1, "cut"), A)
check(hadToast(A, "cutRes") or hadToast(A, "cutNone"), "стрижка без результата")
check(promptOf(m1, "cut") == nil, "можно стричь второй раз")

section("доход и касса")
local before = cash(A)
M.advance(10)
local pad = Map.Plot1.Kassa
pad.Touched:Fire(A.Character.HumanoidRootPart)
M.advance(0.1)
check(cash(A) > before, "касса не дала денег")

section("скрещивание")
chat(A, "!cash 1000000")
local m3 = buy(A, 3)
goHome(A)
check(m3:GetAttribute("State") == "seat", "второй клиент не сел")
local seat1 = m1
trig(promptOf(m1, "fuse"), A)
check(m1:FindFirstChild("FuseHL") ~= nil, "нет подсветки выбранного")
trig(promptOf(m3, "fuse"), A)
local hy
for _, m in ipairs(seated(A)) do if m:GetAttribute("Cid2") then hy = m end end
check(hy ~= nil, "гибрид не появился")
check(hy and hy:GetAttribute("Cid") == 1 and hy:GetAttribute("Cid2") == 3, "гибрид не из тех клиентов")
check(#seated(A) == 1, "после скрещивания должно быть 1 место, а " .. #seated(A))
check(hy and promptOf(hy, "fuse") == nil, "гибрид можно скрещивать дальше")
check(hadToast(A, "fused"), "нет сообщения fused")
check(m1.Parent == nil and m3.Parent == nil, "исходники не удалены")
-- отмена выбора
local m4 = buy(A, 4); goHome(A)
trig(promptOf(m4, "fuse"), A)
trig(promptOf(m4, "fuse"), A)
check(hadToast(A, "fuseCancel"), "повторное нажатие не отменило выбор")
check(m4:FindFirstChild("FuseHL") == nil, "подсветка осталась после отмены")

section("вход игрока B и кража")
local B = E.join("Bob", 2)
M.advance(1)
remote(B, "ready")
check(B:GetAttribute("Plot") == 2, "B не получил участок 2")
clearMsgs(A)
steal(B, hy)
check(hy:GetAttribute("State") == "carried", "кража не началась")
check(hadToast(A, "beingStolen"), "A не предупредили о краже")
-- A пока не может положить нового клиента в зарезервированное кресло (проверка: свободных меньше)
goHome(B)
check(hy:GetAttribute("State") == "seat" and hy:GetAttribute("Owner") == 2, "вор не довёз клиента")
check(hadToast(A, "stolen"), "A не узнал, что украли")
check(promptOf(hy, "fuse") == nil, "у гибрида появилась кнопка скрещивания")

section("отобрать у вора")
goHome(A)
steal(A, hy)
check(hy:GetAttribute("State") == "carried", "A не смог украсть обратно")
local tb
for _, c in ipairs(A.Character.HumanoidRootPart:GetChildren()) do if c:IsA("ProximityPrompt") then tb = c end end
check(tb and tb:GetAttribute("Only") == 2, "нет кнопки Отобрать для B")
trig(tb, B)
check(hy:GetAttribute("State") == "seat" and hy:GetAttribute("Owner") == 2, "Отобрать не вернуло клиента B")
check(tb.Parent == nil, "кнопка Отобрать не исчезла")

section("бритьё вора")
clearMsgs(A)
steal(A, hy)
check(hy:GetAttribute("State") == "carried", "вторая кража не началась")
local apos = A.Character.HumanoidRootPart.Position
moveTo(B, apos + Vector3.new(0, 0, 4), apos)
local tool = B.Backpack:FindFirstChild("Clipper ✂")
M.advance(11) -- защита после появления 10 сек
tool.Activated:Fire()
M.advance(0.2)
check(A.Character:FindFirstChild("Hat1") == nil, "шапки не слетели")
check(A.Character.Head:FindFirstChild("BaldTag") ~= nil, "нет надписи ЛЫСЫЙ")
check(hy:GetAttribute("Owner") == 2 and hy:GetAttribute("State") == "seat", "побритый вор не уронил клиента")
check(hadToast(A, "shaved"), "A не узнал, что его побрили")
check(A.Character.Humanoid.WalkSpeed < 16, "не замедлили")
M.advance(1.3); tool.Activated:Fire(); M.advance(0.2)
check(hadToast(B, "shaveImmune"), "второе бритьё подряд не заблокировано")
M.advance(26)
check(A.Character:FindFirstChild("Hat1") ~= nil, "шапки не вернулись")
check(A.Character.Humanoid.WalkSpeed == 16, "скорость не вернулась")

section("замок")
local lockPP
for _, c in ipairs(Map.Plot2.LockButton:GetChildren()) do if c:IsA("ProximityPrompt") then lockPP = c end end
check(lockPP and lockPP:GetAttribute("Only") == 2, "кнопка двери не привязана к B")
trig(lockPP, B)
check(Map.Plot2:FindFirstChild("LockButton") and hadToast(B, "lockOn"), "дверь не закрылась")
clearMsgs(A)
steal(A, hy)
check(hadToast(A, "locked") and hy:GetAttribute("State") == "seat", "закрытая дверь не защитила")
moveTo(A, Map.Plot2.Home.Position)
M.advance(0.5)
local lp = Map.Plot2.Home.Position
check((A.Character.HumanoidRootPart.Position - lp).Magnitude > 5, "чужого не вытолкнуло из закрытого барбершопа")
M.advance(31)

section("рост причёсок и срезание")
check((hy:GetAttribute("Grow") or 0) >= 1, "причёска не растёт")
chat(B, "!grow")
check(hy:GetAttribute("Grow") == C.GrowMax, "!grow не сработал")
local trimPP = promptOf(hy, "trim")
check(trimPP ~= nil and trimPP:GetAttribute("Not") == 2, "нет кнопки срезать для чужих")
local ca = cash(A)
clearMsgs(B)
trig(trimPP, A)
M.advance(1.1)
check(hy:GetAttribute("Grow") == 0, "причёска не сброшена после срезания")
check(cash(A) > ca, "срезавший не получил денег")
check(hadToast(B, "trimmed"), "хозяин не узнал о срезании")
check(promptOf(hy, "trim") == nil, "кнопка срезать осталась на лысом")

section("босс")
chat(A, "!event boss")
local boss = Map:FindFirstChild("Boss")
check(boss ~= nil, "Йети не появился")
moveTo(A, Vector3.new(5, 3, 0)); moveTo(B, Vector3.new(-5, 3, 0))
local toolA = A.Backpack:FindFirstChild("Clipper ✂")
local hits = 0
for i = 1, 200 do
	if not Map:FindFirstChild("Boss") then break end
	toolA.Activated:Fire()
	if i % 3 == 0 then tool.Activated:Fire() end
	M.advance(1.25)
	hits = hits + 1
end
check(Map:FindFirstChild("Boss") == nil, "Йети не побеждён за 200 ударов")
check(hadToast(A, "bossDown") ~= nil, "нет сообщения bossDown")
local yetiOwner
for _, m in ipairs(Clients:GetChildren()) do if m:GetAttribute("Cid") == 21 then yetiOwner = m:GetAttribute("Owner") end end
check(yetiOwner == 1, "Йети не достался тому, кто бил больше (A), а: " .. tostring(yetiOwner))
check(hadToast(A, "bossReward"), "A не получил награду")

section("покупка Час пик во время босса")
chat(A, "!event boss")
clearMsgs(A)
local r = E.MPS.ProcessReceipt({ PlayerId = 1, ProductId = 104, PurchaseId = "p1" })
check(r == "Enum.ProductPurchaseDecision.PurchaseGranted", "покупка не принята")
check(Map:FindFirstChild("Boss") ~= nil, "купленный час пик убрал босса")
check(hadToast(A, "bossLeft") == nil, "босс ушёл из-за покупки")
local r2 = E.MPS.ProcessReceipt({ PlayerId = 1, ProductId = 104, PurchaseId = "p1" })
check(r2 == "Enum.ProductPurchaseDecision.PurchaseGranted", "повтор покупки не принят как выданный")
M.advance(160)
local evRush = false
for _, m in ipairs(E.msgs[A]) do if m[1] == "event" and m[2] == "rush" then evRush = true end end
check(evRush, "отложенный Час пик не начался после босса")
local c0 = cash(A)
E.MPS.ProcessReceipt({ PlayerId = 1, ProductId = 101, PurchaseId = "p2" })
M.advance(0.1)
check(cash(A) >= c0 + 5000, "пачка денег не начислена")
local c1 = cash(A)
E.MPS.ProcessReceipt({ PlayerId = 1, ProductId = 101, PurchaseId = "p2" })
M.advance(0.1)
check(cash(A) == c1, "повторная выдача той же покупки: " .. tostring(c1) .. " -> " .. tostring(cash(A)))

section("улучшения, коды, перерождение")
local ch0 = last[A].chairs
remote(A, "upgrade", "chairs")
check(last[A].chairs == ch0 + 1, "кресло не купилось")
remote(A, "upgrade", "lock")
check(last[A].lock == 1, "дверь не улучшилась")
remote(A, "code", "shakweb ")
check(hadToast(A, "codeOk"), "код SHAKWEB не принят")
remote(A, "code", "SHAKWEB")
check(hadToast(A, "codeUsed"), "код принят дважды")
remote(A, "code", "nope")
check(hadToast(A, "codeBad"), "неверный код не отклонён")
chat(A, "!cash 50000000")
local nSeat = #seated(A)
check(nSeat >= 1, "у A нет клиентов перед перерождением")
remote(A, "rebirth")
check(last[A].reb == 1 and last[A].cash == C.StartCash, "перерождение не сработало")
check(#seated(A) == 0, "клиенты остались после перерождения")

section("смерть с купленным клиентом")
local mk = buy(A, 2)
E.kill(A)
M.advance(0.2)
check(mk:GetAttribute("State") == "seat" and mk:GetAttribute("Owner") == 1, "купленный клиент не вернулся домой после смерти")
E.respawn(A)
M.advance(0.5)

section("таймаут кражи")
local mb = buy(B, 1); goHome(B)
moveTo(A, Vector3.new(60, 3, 60))
steal(A, mb)
check(mb:GetAttribute("State") == "carried", "кража не началась (таймаут)")
M.advance(46)
check(mb:GetAttribute("State") == "seat" and mb:GetAttribute("Owner") == 2, "после 45 сек клиент не вернулся")

section("хозяин вышел, пока вор несёт")
local cbefore
steal(A, mb)
cbefore = cash(A)
E.leave(B)
M.advance(0.5)
check(mb:GetAttribute("State") == "carried", "клиент пропал у вора, когда хозяин вышел")
E.kill(A)
M.advance(0.2)
check(cash(A) == cbefore or (mb:GetAttribute("State") == "seat"), "вор получил деньги как возврат")
E.respawn(A); M.advance(0.5)

section("сохранение и загрузка")
check(E.store["u_2"] ~= nil, "B не сохранился при выходе")
local saved = E.store["u_2"]
local hasHy = false
for _, s in ipairs(saved.seats) do if s.c2 then hasHy = true end end
check(hasHy, "гибрид не сохранился")
M.advance(3600)
local B2 = E.join("Bob", 2)
M.advance(1)
remote(B2, "ready")
local hy2
for _, m in ipairs(seated(B2)) do if m:GetAttribute("Cid2") then hy2 = m end end
check(hy2 ~= nil, "гибрид не загрузился")
check(hadToast(B2, "offline"), "нет сообщения про офлайн-доход")
check(B2:GetAttribute("Plot") ~= nil, "B не получил участок при перезаходе")

section("переполнение сервера")
local extra = {}
for i = 3, 7 do table.insert(extra, E.join("P" .. i, 10 + i)) M.advance(0.5) end
check((E.kicked or 0) == 1, "7-й игрок не отклонён, kicked=" .. tostring(E.kicked))

section("сбой DataStore")
for _, p in ipairs(extra) do if p.Parent then E.leave(p) end end
E.dsFail = true
local Cc = E.join("Carl", 30)
M.advance(8)
remote(Cc, "ready")
check(hadToast(Cc, "nosave"), "игрок не предупреждён, что сохранения нет")
local savesBefore = E.saves or 0
E.dsFail = false
E.leave(Cc)
M.advance(0.5)
check(E.store["u_30"] == nil, "данные с неудачной загрузкой перезаписали сохранение")

section("события по расписанию")
local ev0 = 0
for _, m in ipairs(E.msgs[A]) do if m[1] == "event" then ev0 = ev0 + 1 end end
M.advance(500)
local ev1 = 0
for _, m in ipairs(E.msgs[A]) do if m[1] == "event" then ev1 = ev1 + 1 end end
check(ev1 > ev0, "событие по расписанию не началось")

section("закрытие сервера")
if E.onClose then task.spawn(E.onClose) end
M.advance(3)

print("")
print("ОШИБКИ ВЫПОЛНЕНИЯ: " .. #M.errors)
for i, e in ipairs(M.errors) do if i <= 8 then print(e) end end
print("ПРОВЕРОК ПРОЙДЕНО: " .. passes .. ", НЕ ПРОЙДЕНО: " .. #fails)
