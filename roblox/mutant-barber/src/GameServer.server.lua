-- GameServer (Script в ServerScriptService)
-- «Барбер-мутант»: строит карту, водит клиентов по улице, покупка, стрижка с мутациями,
-- скрещивание клиентов, растущие причёски, кража, машинка-оружие, босс Йети,
-- события, сохранения, покупки за робуксы.

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local DSS = game:GetService("DataStoreService")
local MPS = game:GetService("MarketplaceService")
local Lighting = game:GetService("Lighting")
local Debris = game:GetService("Debris")

local C = require(RS:WaitForChild("Config"))

local Net = Instance.new("RemoteEvent")
Net.Name = "Net"
Net.Parent = RS

local Store, Board
pcall(function()
	Store = DSS:GetDataStore("MutantBarber_v1")
	Board = DSS:GetOrderedDataStore("MutantBarberEarned_v1")
end)

local S = {} -- состояние игроков: S[player]
local Ev = nil -- текущее событие {id, ends}
local Boss = nil

local BOSS_CID
for cid, d in ipairs(C.Clients) do
	if d.boss then BOSS_CID = cid end
end

local function now() return workspace:GetServerTimeNow() end
local function toast(p, key, a, b)
	if p and p.Parent then Net:FireClient(p, "toast", key, a, b) end
end

Lighting.ClockTime = 14.5
Lighting.Brightness = 2.5
Lighting.Ambient = Color3.fromRGB(90, 90, 100)
Lighting.OutdoorAmbient = Color3.fromRGB(150, 150, 160)

---------------------------------------------------------------- строим карту
local function part(parent, size, cf, color, mat, shape)
	local p = Instance.new("Part")
	p.Anchored = true
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	if shape then p.Shape = shape end
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function surfaceText(p, face, text, color, font)
	local g = Instance.new("SurfaceGui")
	g.Face = face or Enum.NormalId.Front
	g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	g.PixelsPerStud = 40
	g.LightInfluence = 0
	g.Parent = p
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Text = text
	t.TextScaled = true
	t.Font = font or Enum.Font.FredokaOne
	t.TextColor3 = color or Color3.new(1, 1, 1)
	t.Parent = g
	local s = Instance.new("UIStroke")
	s.Thickness = 3
	s.Color = Color3.fromRGB(20, 20, 30)
	s.Parent = t
	return t
end

-- разлёт волос: кубики разлетаются и исчезают
local function burst(pos, color, n)
	for _ = 1, n or 12 do
		local b = Instance.new("Part")
		b.Size = Vector3.new(0.3, 0.3, 0.7)
		b.Color = color or Color3.fromRGB(90, 60, 40)
		b.Material = Enum.Material.SmoothPlastic
		b.CanCollide = false
		b.CanQuery = false
		b.CanTouch = false
		b.CFrame = CFrame.new(pos) * CFrame.Angles(math.random() * 6, math.random() * 6, math.random() * 6)
		b.Parent = workspace
		b.AssemblyLinearVelocity = Vector3.new(math.random(-14, 14), math.random(12, 26), math.random(-14, 14))
		Debris:AddItem(b, 1.6)
	end
end

local Map = Instance.new("Folder")
Map.Name = "Map"
Map.Parent = workspace
local ClientsF = Instance.new("Folder")
ClientsF.Name = "Clients"
ClientsF.Parent = workspace

part(Map, Vector3.new(340, 1, 200), CFrame.new(0, -0.5, 0), Color3.fromRGB(96, 160, 82), Enum.Material.Grass)
part(Map, Vector3.new(250, 0.2, 16), CFrame.new(0, 0.1, 0), Color3.fromRGB(52, 54, 62), Enum.Material.Asphalt)
for x = -114, 114, 12 do
	part(Map, Vector3.new(5, 0.05, 0.5), CFrame.new(x, 0.22, 0), Color3.fromRGB(240, 225, 150))
end
part(Map, Vector3.new(250, 0.6, 6), CFrame.new(0, 0.3, 11), Color3.fromRGB(175, 175, 180), Enum.Material.Concrete)
part(Map, Vector3.new(250, 0.6, 6), CFrame.new(0, 0.3, -11), Color3.fromRGB(175, 175, 180), Enum.Material.Concrete)

local spawnLoc = Instance.new("SpawnLocation")
spawnLoc.Anchored = true
spawnLoc.Size = Vector3.new(8, 0.4, 8)
spawnLoc.CFrame = CFrame.new(0, 0.3, 0)
spawnLoc.Transparency = 1
spawnLoc.CanCollide = false
spawnLoc.Neutral = true
spawnLoc.Duration = 0
spawnLoc.Parent = Map

-- арка с названием на въезде
do
	part(Map, Vector3.new(2, 16, 2), CFrame.new(-122, 8, 9), Color3.fromRGB(30, 34, 60))
	part(Map, Vector3.new(2, 16, 2), CFrame.new(-122, 8, -9), Color3.fromRGB(30, 34, 60))
	local top = part(Map, Vector3.new(2, 5, 22), CFrame.new(-122, 18, 0) * CFrame.Angles(0, -math.pi / 2, 0), Color3.fromRGB(120, 40, 200), Enum.Material.Neon)
	surfaceText(top, Enum.NormalId.Front, "MUTANT BARBER", Color3.fromRGB(255, 255, 255))
	surfaceText(top, Enum.NormalId.Back, "БАРБЕР-МУТАНТ", Color3.fromRGB(255, 255, 255))
end

-- таблица лидеров в конце улицы
local boardRows = {}
do
	part(Map, Vector3.new(1.5, 10, 1.5), CFrame.new(132, 5, 6), Color3.fromRGB(30, 34, 60))
	part(Map, Vector3.new(1.5, 10, 1.5), CFrame.new(132, 5, -6), Color3.fromRGB(30, 34, 60))
	local bp = part(Map, Vector3.new(18, 16, 1), CFrame.lookAt(Vector3.new(132, 16, 0), Vector3.new(0, 16, 0)), Color3.fromRGB(24, 30, 52))
	bp.Name = "Leaderboard"
	local g = Instance.new("SurfaceGui")
	g.Face = Enum.NormalId.Front
	g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	g.PixelsPerStud = 30
	g.LightInfluence = 0
	g.Parent = bp
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 4)
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.Parent = g
	local head = Instance.new("TextLabel")
	head.Size = UDim2.new(1, -20, 0, 70)
	head.BackgroundTransparency = 1
	head.Font = Enum.Font.FredokaOne
	head.TextScaled = true
	head.TextColor3 = Color3.fromRGB(255, 200, 60)
	head.Text = "TOP BARBERS"
	head.Parent = g
	for i = 1, 10 do
		local t = Instance.new("TextLabel")
		t.Size = UDim2.new(1, -30, 0, 36)
		t.BackgroundTransparency = 1
		t.Font = Enum.Font.GothamBold
		t.TextScaled = true
		t.TextXAlignment = Enum.TextXAlignment.Left
		t.TextColor3 = Color3.new(1, 1, 1)
		t.Text = ""
		t.Parent = g
		boardRows[i] = t
	end
	if not Board then boardRows[1].Text = "Works in the published game" end
end

-- 6 барбершопов: по 3 с каждой стороны улицы. Перед (-Z в локальных координатах) смотрит на улицу.
local WALLS = {
	Color3.fromRGB(214, 92, 92), Color3.fromRGB(92, 150, 214), Color3.fromRGB(236, 186, 70),
	Color3.fromRGB(110, 190, 120), Color3.fromRGB(170, 110, 210), Color3.fromRGB(240, 140, 70),
}
local SEATS = {}
for row = 1, 2 do
	for i = 1, 6 do
		table.insert(SEATS, Vector3.new(-17.5 + (i - 1) * 7, 0, row == 1 and 3 or 12))
	end
end

local function pole(parent, cf)
	local cols = { Color3.fromRGB(214, 48, 49), Color3.fromRGB(245, 245, 245), Color3.fromRGB(32, 96, 200), Color3.fromRGB(245, 245, 245) }
	for i = 0, 7 do
		part(parent, Vector3.new(1, 1.6, 1.6), cf * CFrame.new(0, 1.4 + i, 0) * CFrame.Angles(0, 0, math.pi / 2), cols[i % 4 + 1], Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
	end
	part(parent, Vector3.new(1.8, 1.8, 1.8), cf * CFrame.new(0, 9.4, 0), Color3.fromRGB(255, 255, 255), Enum.Material.Glass, Enum.PartType.Ball).Transparency = 0.3
end

local PLOTS = {}
local plotSpots = { { -50, 34, 0 }, { 0, 34, 0 }, { 50, 34, 0 }, { -50, -34, math.pi }, { 0, -34, math.pi }, { 50, -34, math.pi } }
for i, sp in ipairs(plotSpots) do
	local f = Instance.new("Model")
	f.Name = "Plot" .. i
	f.Parent = Map
	local cf = CFrame.new(sp[1], 1, sp[2]) * CFrame.Angles(0, sp[3], 0)
	local wall = WALLS[i]
	for gx = 0, 10 do
		for gz = 0, 9 do
			local c = ((gx + gz) % 2 == 0) and Color3.fromRGB(28, 28, 32) or Color3.fromRGB(240, 238, 232)
			part(f, Vector3.new(4, 1, 4), cf * CFrame.new(-20 + gx * 4, -0.5, -18 + gz * 4), c)
		end
	end
	part(f, Vector3.new(44, 12, 1), cf * CFrame.new(0, 6, 20), wall, Enum.Material.Brick)
	part(f, Vector3.new(1, 12, 40), cf * CFrame.new(-22, 6, 0), wall, Enum.Material.Brick)
	part(f, Vector3.new(1, 12, 40), cf * CFrame.new(22, 6, 0), wall, Enum.Material.Brick)
	part(f, Vector3.new(46, 1, 4), cf * CFrame.new(0, 12.5, -19), Color3.fromRGB(245, 245, 245))
	pole(f, cf * CFrame.new(-23.5, 0, -20.5))
	pole(f, cf * CFrame.new(23.5, 0, -20.5))
	for k = 1, 6 do
		local m = part(f, Vector3.new(4.5, 5, 0.3), cf * CFrame.new(-17.5 + (k - 1) * 7, 6, 19.4), Color3.fromRGB(200, 225, 235), Enum.Material.Glass)
		m.Reflectance = 0.5
	end
	local sign = part(f, Vector3.new(26, 4.5, 0.6), cf * CFrame.new(0, 15, 19.5), Color3.fromRGB(24, 30, 52))
	local signText = surfaceText(sign, Enum.NormalId.Front, "", Color3.fromRGB(255, 244, 220))

	local chairs = {}
	for s, v in ipairs(SEATS) do
		local base = cf * CFrame.new(v)
		chairs[s] = {
			part(f, Vector3.new(2.6, 1.8, 2.6), base * CFrame.new(0, 0.9, 0), Color3.fromRGB(40, 40, 46), Enum.Material.Metal),
			part(f, Vector3.new(3, 0.5, 3), base * CFrame.new(0, 2.05, 0), Color3.fromRGB(150, 30, 40), Enum.Material.Leather),
			part(f, Vector3.new(3, 3.2, 0.5), base * CFrame.new(0, 3.7, 1.4), Color3.fromRGB(150, 30, 40), Enum.Material.Leather),
		}
	end

	local pad = part(f, Vector3.new(6, 0.3, 6), cf * CFrame.new(-15, 0.15, -14), Color3.fromRGB(80, 220, 120), Enum.Material.Neon)
	pad.Name = "Kassa"
	local kg = Instance.new("BillboardGui")
	kg.Size = UDim2.fromOffset(170, 50)
	kg.StudsOffset = Vector3.new(0, 3, 0)
	kg.MaxDistance = 80
	kg.LightInfluence = 0
	kg.Parent = pad
	local kt = Instance.new("TextLabel")
	kt.Size = UDim2.fromScale(1, 1)
	kt.BackgroundTransparency = 1
	kt.Font = Enum.Font.FredokaOne
	kt.TextScaled = true
	kt.TextColor3 = Color3.fromRGB(120, 255, 150)
	kt.Text = ""
	kt.Parent = kg
	local ks = Instance.new("UIStroke")
	ks.Thickness = 2
	ks.Parent = kt

	local btn = part(f, Vector3.new(1.2, 3, 3), cf * CFrame.new(15, 0.6, -14) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(220, 60, 60), Enum.Material.Neon, Enum.PartType.Cylinder)
	btn.Name = "LockButton"
	local lg = kg:Clone()
	lg.Parent = btn
	local lt = lg:FindFirstChildOfClass("TextLabel")
	lt.TextColor3 = Color3.fromRGB(255, 140, 140)

	local laser = part(f, Vector3.new(44, 10, 0.4), cf * CFrame.new(0, 5, -20), Color3.fromRGB(255, 40, 40), Enum.Material.Neon)
	laser.Transparency = 1
	laser.CanCollide = false
	laser.CanQuery = false
	laser.CanTouch = false

	local home = part(f, Vector3.new(1, 1, 1), cf * CFrame.new(0, 3, -16), Color3.new(1, 1, 1))
	home.Name = "Home"
	home.Transparency = 1
	home.CanCollide = false
	home.CanQuery = false
	local ha = Instance.new("Attachment")
	ha.Name = "A"
	ha.Parent = home

	PLOTS[i] = { i = i, cf = cf, model = f, chairs = chairs, pad = pad, padText = kt, btn = btn, btnText = lt, laser = laser, signText = signText, owner = nil, lockedUntil = 0 }
end

local function setChairs(plot, n)
	for s, set in ipairs(plot.chairs) do
		for _, p in ipairs(set) do
			p.Transparency = (s <= n) and 0 or 0.85
			p.CanCollide = s <= n
		end
	end
end
for _, plot in ipairs(PLOTS) do setChairs(plot, 0) end

---------------------------------------------------------------- клиенты
-- cid2: тело от второго клиента (гибрид). Возвращает модель и список частей причёски.
local function buildClient(cid, cid2, scaleOverride)
	local A = C.Clients[cid]
	local B = cid2 and C.Clients[cid2] or A
	local s = scaleOverride or (((A.scale or 1) + (B.scale or 1)) / 2)
	local m = Instance.new("Model")
	m.Name = "Client"
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = Vector3.new(2, 2, 1) * s
	root.Transparency = 1
	root.Anchored = true
	root.CanCollide = false
	root.Massless = true
	root.CFrame = CFrame.new(0, 200, 0)
	root.Parent = m
	m.PrimaryPart = root
	local hair = {}
	local function add(name, size, off, color, shape, mat)
		local p = Instance.new("Part")
		p.Name = name
		p.Size = size * s
		p.Color = color
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.Massless = true
		p.Anchored = false
		local rot = off - off.Position
		local pos = off.Position * s
		local c0 = CFrame.new(pos) * rot
		p.CFrame = root.CFrame * c0
		local w = Instance.new("Weld")
		w.Part0 = root
		w.Part1 = p
		w.C0 = c0
		w.Parent = p
		p.Parent = m
		if name == "Hair" then table.insert(hair, { p = p, w = w, size = p.Size, pos = pos, rot = rot }) end
		return p
	end
	local V = Vector3.new
	local CF = CFrame.new
	local An = CFrame.Angles
	add("Torso", V(2, 2, 1), CF(0, 0, 0), B.shirt)
	add("Leg", V(0.95, 2, 1), CF(-0.5, -2, 0), B.pants)
	add("Leg", V(0.95, 2, 1), CF(0.5, -2, 0), B.pants)
	add("Arm", V(0.9, 2, 1), CF(-1.45, 0, 0), B.shirt)
	add("Arm", V(0.9, 2, 1), CF(1.45, 0, 0), B.shirt)
	local head = add("Head", V(1.6, 1.6, 1.6), CF(0, 1.85, 0), A.skin, Enum.PartType.Ball)
	add("Face", V(0.25, 0.25, 0.25), CF(-0.32, 1.95, -0.72), Color3.fromRGB(20, 20, 25), Enum.PartType.Ball)
	add("Face", V(0.25, 0.25, 0.25), CF(0.32, 1.95, -0.72), Color3.fromRGB(20, 20, 25), Enum.PartType.Ball)
	add("Face", V(0.55, 0.12, 0.12), CF(0, 1.5, -0.74), Color3.fromRGB(120, 40, 40))
	if cid2 then
		-- шов гибрида: светящийся ошейник
		add("Seam", V(0.35, 1.5, 1.5), CF(0, 1.05, 0) * An(0, 0, math.pi / 2), Color3.fromRGB(120, 255, 160), Enum.PartType.Cylinder, Enum.Material.Neon)
	end
	for _, st in ipairs(B.style) do
		if st == "ears" then
			add("Tail", V(0.35, 0.35, 2), CF(0, -1.6, 1.3) * An(math.rad(-35), 0, 0), B.hair)
		end
	end
	local hc = A.hair
	for _, st in ipairs(A.style) do
		if st == "short" or st == "bun" or st == "long" then
			add("Hair", V(1.75, 0.5, 1.75), CF(0, 2.55, 0.05), hc)
		end
		if st == "pomp" then
			add("Hair", V(1.6, 0.8, 1.3), CF(0, 2.75, -0.15) * An(math.rad(-15), 0, 0), hc)
		elseif st == "mohawk" then
			add("Hair", V(0.4, 1.2, 1.8), CF(0, 2.9, 0.1), hc)
		elseif st == "afro" then
			add("Hair", V(2.6, 2.6, 2.6), CF(0, 2.45, 0.3), hc, Enum.PartType.Ball)
		elseif st == "long" then
			add("Hair", V(1.75, 2, 0.4), CF(0, 1.6, 0.75), hc)
		elseif st == "bun" then
			add("Hair", V(0.9, 0.9, 0.9), CF(0, 2.95, 0.55), hc, Enum.PartType.Ball)
		elseif st == "beard" then
			add("Hair", V(1.3, 0.8, 0.5), CF(0, 1.3, -0.62), hc)
		elseif st == "spikes" or st == "spikesBig" then
			local k = (st == "spikesBig") and 1.6 or 1
			add("Hair", V(0.35, 1 * k, 0.35), CF(0, 2.6 + 0.5 * k, 0), hc)
			add("Hair", V(0.35, 1 * k, 0.35), CF(-0.5, 2.5 + 0.4 * k, 0) * An(0, 0, math.rad(30)), hc)
			add("Hair", V(0.35, 1 * k, 0.35), CF(0.5, 2.5 + 0.4 * k, 0) * An(0, 0, math.rad(-30)), hc)
			add("Hair", V(0.35, 1 * k, 0.35), CF(0, 2.5 + 0.4 * k, 0.5) * An(math.rad(30), 0, 0), hc)
			add("Hair", V(0.35, 1 * k, 0.35), CF(0, 2.5 + 0.4 * k, -0.4) * An(math.rad(-30), 0, 0), hc)
			if st == "spikesBig" then
				add("Hair", V(0.35, 1.4, 0.35), CF(0, 1.6, 1) * An(math.rad(70), 0, 0), hc)
				add("Hair", V(0.35, 1.4, 0.35), CF(-0.6, 1.9, 0.9) * An(math.rad(60), 0, math.rad(30)), hc)
				add("Hair", V(0.35, 1.4, 0.35), CF(0.6, 1.9, 0.9) * An(math.rad(60), 0, math.rad(-30)), hc)
			end
		elseif st == "ears" then
			add("Hair", V(0.55, 0.8, 0.3), CF(-0.5, 2.75, 0) * An(0, 0, math.rad(15)), hc)
			add("Hair", V(0.55, 0.8, 0.3), CF(0.5, 2.75, 0) * An(0, 0, math.rad(-15)), hc)
		elseif st == "antenna" then
			add("Hair", V(0.15, 1.2, 0.15), CF(-0.35, 3.1, 0) * An(0, 0, math.rad(15)), hc)
			add("Hair", V(0.15, 1.2, 0.15), CF(0.35, 3.1, 0) * An(0, 0, math.rad(-15)), hc)
			add("Hair", V(0.45, 0.45, 0.45), CF(-0.5, 3.7, 0), hc, Enum.PartType.Ball)
			add("Hair", V(0.45, 0.45, 0.45), CF(0.5, 3.7, 0), hc, Enum.PartType.Ball)
		elseif st == "bald" then
			head.Reflectance = 0.25
		elseif st == "crown" then
			add("Crown", V(1.3, 0.35, 1.3), CF(0, 2.75, 0), hc, nil, Enum.Material.Neon)
			for _, o in ipairs({ { -0.5, -0.5 }, { 0.5, -0.5 }, { -0.5, 0.5 }, { 0.5, 0.5 } }) do
				add("Crown", V(0.28, 0.55, 0.28), CF(o[1], 3.15, o[2]), hc, nil, Enum.Material.Neon)
			end
		elseif st == "helmet" then
			local h = add("Helmet", V(2.2, 2.2, 2.2), CF(0, 1.9, 0), Color3.fromRGB(200, 230, 255), Enum.PartType.Ball, Enum.Material.Glass)
			h.Transparency = 0.6
		end
	end
	return m, hair, s
end

-- размер причёски: растёт от макушки вверх и в стороны
local function sizeHair(o, k)
	local top = Vector3.new(0, 2.65 * o.scale, 0)
	for _, h in ipairs(o.hair) do
		h.p.Size = h.size * k
		h.w.C0 = CFrame.new(top + (h.pos - top) * k) * h.rot
	end
end
local function setGrow(o, g)
	o.grow = g
	sizeHair(o, C.growSize(g))
	o.model:SetAttribute("Grow", g)
end

local function applyMut(m, mut)
	if not mut or mut == "none" then return end
	local md = C.Mutations[mut]
	if not md then return end
	local targets = {}
	for _, p in ipairs(m:GetChildren()) do
		if p.Name == "Hair" then table.insert(targets, p) end
	end
	local head = m:FindFirstChild("Head")
	if #targets == 0 then targets = { head } end
	for _, p in ipairs(targets) do
		p.Color = md.color
		if mut == "diamond" then
			p.Material = Enum.Material.Glass
			p.Reflectance = 0.35
			p.Transparency = 0.1
		else
			p.Material = Enum.Material.Neon
		end
	end
	if mut == "diamond" or mut == "star" then
		local sp = Instance.new("Sparkles")
		sp.SparkleColor = md.color
		sp.Parent = head
	end
	if mut == "cosmic" or mut == "star" or mut == "rainbow" then
		local pe = Instance.new("ParticleEmitter")
		pe.Color = ColorSequence.new(md.color)
		pe.LightEmission = 1
		pe.Rate = 10
		pe.Lifetime = NumberRange.new(0.8, 1.4)
		pe.Speed = NumberRange.new(1, 3)
		pe.Size = NumberSequence.new(0.35, 0)
		pe.SpreadAngle = Vector2.new(180, 180)
		pe.Parent = head
		local l = Instance.new("PointLight")
		l.Color = md.color
		l.Brightness = 1.5
		l.Range = 9
		l.Parent = head
	end
end

local Objs = {}
local Street = {}
local uidN = 0

local function newObj(cid, mut, cid2)
	uidN = uidN + 1
	local o = { uid = uidN, cid = cid, cid2 = cid2, mut = mut or "none", cut = (mut ~= nil and mut ~= "none"), grow = 0 }
	o.model, o.hair, o.scale = buildClient(cid, cid2)
	o.root = o.model.PrimaryPart
	applyMut(o.model, o.mut)
	o.model:SetAttribute("Cid", cid)
	if cid2 then o.model:SetAttribute("Cid2", cid2) end
	o.model:SetAttribute("Mut", o.mut)
	o.model:SetAttribute("Grow", 0)
	o.model:SetAttribute("State", "street")
	o.model.Parent = ClientsF
	Objs[o.uid] = o
	return o
end

local function destroyObj(o)
	o.state = "gone"
	if o.tbPrompt then o.tbPrompt:Destroy() o.tbPrompt = nil end
	if o.model then o.model:Destroy() end
	Objs[o.uid] = nil
end

local function mutMult(o) return C.Mutations[o.mut] and C.Mutations[o.mut].mult or 1 end
local function baseInc(o)
	local _, inc = C.stats(o.cid, o.cid2)
	return inc * mutMult(o) * C.growMult(o.grow)
end
local function sellPrice(o)
	local price = C.stats(o.cid, o.cid2)
	return math.floor(price * mutMult(o) * C.growMult(o.grow) * C.SellRate)
end
local function trimReward(o)
	local _, inc = C.stats(o.cid, o.cid2)
	return math.floor(inc * mutMult(o) * C.growMult(o.grow) * C.TrimSeconds)
end

local function clearPrompts(o)
	for _, c in ipairs(o.root:GetChildren()) do
		if c:IsA("ProximityPrompt") then c:Destroy() end
	end
end

local DEFAULT_TEXT = { buy = "Buy", cut = "Haircut", sell = "Sell", steal = "Steal", takeback = "Take back", lock = "Lock door", fuse = "Fuse", trim = "Trim hair" }
local function prompt(parent, key, val, hold, keycode, attrs, onTrig)
	local pp = Instance.new("ProximityPrompt")
	pp.ActionText = DEFAULT_TEXT[key] or key
	pp.ObjectText = ""
	pp.HoldDuration = hold or 0
	pp.MaxActivationDistance = 10
	pp.RequiresLineOfSight = false
	pp.KeyboardKeyCode = keycode or Enum.KeyCode.E
	if keycode == Enum.KeyCode.F then
		pp.GamepadKeyCode = Enum.KeyCode.ButtonY
	elseif keycode == Enum.KeyCode.R then
		pp.GamepadKeyCode = Enum.KeyCode.ButtonB
	end
	pp:SetAttribute("K", key)
	if val then pp:SetAttribute("V", val) end
	for k, v in pairs(attrs or {}) do pp:SetAttribute(k, v) end
	pp.Parent = parent
	pp.Triggered:Connect(onTrig)
	return pp
end

---------------------------------------------------------------- игроки: расчёты
local function chairsAvail(st) return st.data.chairs + (st.pass.vip and C.VipChairs or 0) end

local function freeSeat(st)
	for i = 1, chairsAvail(st) do
		if not st.seats[i] then return i end
	end
	return nil
end

local function ips(p)
	local st = S[p]
	if not st or not st.data then return 0 end
	local sum = 0
	for _, o in pairs(st.seats) do
		if o.state == "seat" then sum = sum + baseInc(o) end
	end
	local m = C.rebirthMult(st.data.rebirths)
	if st.pass.x2 then m = m * 2 end
	if Ev and Ev.id == "balm" then m = m * 2 end
	return sum * m
end

local PROD = {}
for _, pr in ipairs(C.Products) do PROD[pr.key] = pr end
local function productCash(p, pr)
	return math.floor(math.max(pr.min or 0, ips(p) * 60 * (pr.minutes or 0)))
end

local function markIndex(p, o)
	local st = S[p]
	if not st or not st.data then return end
	st.data.idx[tostring(o.cid)] = true
	if o.cid2 then st.data.idx["h:" .. o.cid .. ":" .. o.cid2] = true end
	if o.mut ~= "none" then st.data.idx[o.cid .. ":" .. o.mut] = true end
end

local function sendState(p)
	local st = S[p]
	if not st or not st.data or not p.Parent then return end
	local d = st.data
	Net:FireClient(p, "state", {
		cash = d.cash, ips = ips(p), kassa = d.kassa, reb = d.rebirths,
		chairs = d.chairs, vip = st.pass.vip and C.VipChairs or 0, lock = d.lock,
		idx = d.idx, pass = st.pass, luck = math.max(0, (d.luckUntil or 0) - os.time()),
		cash1 = productCash(p, PROD.cash1), cash2 = productCash(p, PROD.cash2),
		carry = st.carry and st.carry.cid or nil,
	})
	local ls = p:FindFirstChild("leaderstats")
	if ls then
		ls.Cash.Value = "$" .. C.fmt(d.cash)
		ls.Rebirths.Value = d.rebirths
	end
end

---------------------------------------------------------------- состояния клиента
local function unweld(o)
	local w = o.root:FindFirstChild("CarryWeld")
	if w then w:Destroy() end
	o.root.Anchored = true
end

local function clearSel(st)
	local o = st.fuseSel
	st.fuseSel = nil
	if o and o.model then
		local h = o.model:FindFirstChild("FuseHL")
		if h then h:Destroy() end
	end
end

local seatObj, makePrompts -- объявим ниже
local Fn = {} -- функции, которые объявлены ниже, но нужны раньше

local function onSeatPrompt(o, kind, p)
	local st = S[p]
	if not st or not st.data or o.state ~= "seat" then return end
	if kind == "cut" then
		if o.owner ~= p or o.cut then return end
		local L = 1
		if st.pass.luck then L = L * 2 end
		if (st.data.luckUntil or 0) > os.time() then L = L * 3 end
		local r, acc, res = math.random(), 0, "none"
		for i = #C.CutOrder, 1, -1 do
			local k = C.CutOrder[i]
			acc = acc + C.Mutations[k].chance * L
			if r < acc then res = k break end
		end
		o.cut = true
		burst(o.root.Position + Vector3.new(0, 3, 0), C.Clients[o.cid].hair, 8)
		if res ~= "none" then
			o.mut = res
			applyMut(o.model, res)
			o.model:SetAttribute("Mut", res)
			markIndex(p, o)
			toast(p, "cutRes", res, tostring(C.Mutations[res].mult))
		else
			toast(p, "cutNone")
		end
		makePrompts(o)
	elseif kind == "sell" then
		if o.owner ~= p then return end
		local v = sellPrice(o)
		if st.fuseSel == o then clearSel(st) end
		st.data.cash = st.data.cash + v
		st.seats[o.seat] = nil
		destroyObj(o)
		toast(p, "sold", C.fmt(v))
	elseif kind == "fuse" then
		if o.owner ~= p or o.cid2 then return end
		local a = st.fuseSel
		if a == o then
			clearSel(st)
			toast(p, "fuseCancel")
		elseif a and a.state == "seat" and a.owner == p and not a.cid2 and st.seats[a.seat] == a then
			clearSel(st)
			local seat = a.seat
			local mut = (mutMult(a) >= mutMult(o)) and a.mut or o.mut
			local ca, cb = a.cid, o.cid
			st.seats[a.seat] = nil
			st.seats[o.seat] = nil
			local pos = a.root.Position
			destroyObj(a)
			destroyObj(o)
			local h = newObj(ca, mut, cb)
			seatObj(h, p, seat)
			burst(pos + Vector3.new(0, 3, 0), Color3.fromRGB(120, 255, 160), 20)
			toast(p, "fused", ca, cb)
		else
			clearSel(st)
			st.fuseSel = o
			local hl = Instance.new("Highlight")
			hl.Name = "FuseHL"
			hl.FillColor = Color3.fromRGB(120, 255, 160)
			hl.OutlineColor = Color3.fromRGB(255, 255, 255)
			hl.FillTransparency = 0.6
			hl.Parent = o.model
			toast(p, "fuseSel", o.cid)
		end
	elseif kind == "steal" or kind == "trim" then
		local victim = o.owner
		if victim == p or not victim then return end
		local vs = S[victim]
		if not vs then return end
		if os.clock() < vs.plot.lockedUntil then toast(p, "locked") return end
		if kind == "trim" then
			if o.grow < C.TrimMin then return end
			local v = trimReward(o)
			st.data.cash = st.data.cash + v
			burst(o.root.Position + Vector3.new(0, 4, 0), C.Clients[o.cid].hair, 20)
			setGrow(o, 0)
			makePrompts(o)
			toast(p, "trimOk", C.fmt(v))
			toast(victim, "trimmed", p.DisplayName)
			sendState(victim)
		else
			if st.carry then toast(p, "handsFull") return end
			if not freeSeat(st) then toast(p, "noSeat") return end
			if Fn.carry(o, p, victim) then
				toast(victim, "beingStolen", p.DisplayName)
			end
		end
	end
	sendState(p)
end

makePrompts = function(o)
	clearPrompts(o)
	local uid = o.owner.UserId
	if not o.cut then
		prompt(o.root, "cut", nil, 1.2, Enum.KeyCode.E, { Only = uid }, function(p) onSeatPrompt(o, "cut", p) end)
	end
	prompt(o.root, "sell", C.fmt(sellPrice(o)), 0.6, Enum.KeyCode.F, { Only = uid }, function(p) onSeatPrompt(o, "sell", p) end)
	if not o.cid2 then
		prompt(o.root, "fuse", nil, 0.3, Enum.KeyCode.R, { Only = uid }, function(p) onSeatPrompt(o, "fuse", p) end)
	end
	prompt(o.root, "steal", nil, 1.5, Enum.KeyCode.E, { Not = uid }, function(p) onSeatPrompt(o, "steal", p) end)
	if o.grow >= C.TrimMin then
		prompt(o.root, "trim", C.fmt(trimReward(o)), 2, Enum.KeyCode.F, { Not = uid }, function(p) onSeatPrompt(o, "trim", p) end)
	end
end

local function refreshPromptValues(o)
	for _, c in ipairs(o.root:GetChildren()) do
		if c:IsA("ProximityPrompt") then
			local k = c:GetAttribute("K")
			if k == "sell" then c:SetAttribute("V", C.fmt(sellPrice(o))) end
			if k == "trim" then c:SetAttribute("V", C.fmt(trimReward(o))) end
		end
	end
end

seatObj = function(o, owner, i)
	local st = S[owner]
	o.state = "seat"
	o.owner = owner
	o.seat = i
	o.carrier = nil
	o.from = nil
	st.seats[i] = o
	unweld(o)
	o.root.CFrame = st.plot.cf * CFrame.new(SEATS[i] + Vector3.new(0, 2.3 + o.scale, 0))
	o.model:SetAttribute("State", "seat")
	o.model:SetAttribute("Owner", owner.UserId)
	o.model:SetAttribute("Price", nil)
	makePrompts(o)
	markIndex(owner, o)
end

local function returnToVictim(o)
	local v, thief = o.from, o.carrier
	if o.tbPrompt then o.tbPrompt:Destroy() o.tbPrompt = nil end
	if thief and S[thief] and S[thief].carry == o then S[thief].carry = nil end
	if v and S[v] and S[v].seats[o.seat] == o then
		seatObj(o, v, o.seat)
		toast(v, "returned")
		if thief then toast(thief, "stealFail") end
		sendState(v)
	else
		destroyObj(o)
	end
	if thief then sendState(thief) end
end

local function carry(o, p, from)
	local char = p.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hrp or not hum or hum.Health <= 0 then return false end
	clearPrompts(o)
	Street[o] = nil
	if from and S[from] and S[from].fuseSel == o then clearSel(S[from]) end
	o.state = "carried"
	o.carrier = p
	o.from = from
	o.stolenAt = os.clock()
	o.model:SetAttribute("State", "carried")
	o.model:SetAttribute("Price", nil)
	local off = CFrame.new(0, 2.8 + 3 * o.scale, 0)
	o.root.CFrame = hrp.CFrame * off
	o.root.Anchored = false
	local w = Instance.new("Weld")
	w.Name = "CarryWeld"
	w.Part0 = hrp
	w.Part1 = o.root
	w.C0 = off
	w.Parent = o.root
	S[p].carry = o
	if from then
		o.tbPrompt = prompt(hrp, "takeback", nil, 0.3, Enum.KeyCode.E, { Only = from.UserId }, function(who)
			if who == from and o.carrier == p and o.state == "carried" then returnToVictim(o) end
		end)
	end
	sendState(p)
	return true
end
Fn.carry = carry

local function deliver(o, p, i)
	local st = S[p]
	local victim = o.from
	if o.tbPrompt then o.tbPrompt:Destroy() o.tbPrompt = nil end
	st.carry = nil
	if victim and S[victim] and S[victim].seats[o.seat] == o then
		S[victim].seats[o.seat] = nil
		toast(victim, "stolen", p.DisplayName)
		sendState(victim)
	end
	seatObj(o, p, i)
	toast(p, victim and "stealOk" or "placed")
	sendState(p)
end

-- игрок погиб, вышел или переродился с клиентом в руках
local function dropCarry(p, leaving)
	local st = S[p]
	local o = st and st.carry
	if not o then return end
	st.carry = nil
	if o.from then
		returnToVictim(o)
		return
	end
	local i = (not leaving) and freeSeat(st)
	if i then
		seatObj(o, p, i)
		toast(p, "carryDrop")
	else
		st.data.cash = st.data.cash + (o.paid or 0)
		destroyObj(o)
		if not leaving then toast(p, "refund") end
	end
end

---------------------------------------------------------------- улица
local function rollClient(rush)
	local total = 0
	local w = {}
	for i, r in ipairs(C.Rarities) do
		w[i] = r.weight * ((rush and i >= 3) and 2.5 or 1)
		total = total + w[i]
	end
	local x = math.random() * total
	local rar = 1
	for i = 1, #w do
		x = x - w[i]
		if x <= 0 then rar = i break end
	end
	local pool = {}
	for cid, d in ipairs(C.Clients) do
		if d.r == rar and not d.boss then table.insert(pool, cid) end
	end
	return pool[math.random(1, #pool)]
end

local function onBuy(o, p)
	local st = S[p]
	if not st or not st.data or o.state ~= "street" then return end
	if st.carry then toast(p, "handsFull") return end
	if not freeSeat(st) then toast(p, "noSeat") return end
	local price = o.price or C.Clients[o.cid].price
	if st.data.cash < price then toast(p, "noMoney") return end
	st.data.cash = st.data.cash - price
	o.paid = price
	if not carry(o, p, nil) then
		st.data.cash = st.data.cash + price
		return
	end
	markIndex(p, o)
	sendState(p)
end

local streetCount = 0
local function spawnStreet(cid, mut)
	local o = newObj(cid, mut)
	o.state = "street"
	o.price = math.floor(C.Clients[cid].price * mutMult(o))
	o.model:SetAttribute("Price", o.price)
	o.x = -118
	o.z = (math.random() < 0.5) and -3.5 or 3.5
	o.t0 = math.random() * 10
	Street[o] = true
	prompt(o.root, "buy", C.fmt(o.price), 0, Enum.KeyCode.E, nil, function(p) onBuy(o, p) end)
	return o
end

local function spawnRandom()
	local cid = rollClient(Ev and Ev.id == "rush")
	local mut = nil
	local r = math.random()
	if r < C.StreetMutDiamond then mut = "diamond" elseif r < C.StreetMutDiamond + C.StreetMutGold then mut = "gold" end
	spawnStreet(cid, mut)
end

local function spawnStar()
	local pool = {}
	for cid, d in ipairs(C.Clients) do
		if d.r >= 4 and not d.boss then table.insert(pool, cid) end
	end
	spawnStreet(pool[math.random(1, #pool)], "star")
end

RunService.Heartbeat:Connect(function(dt)
	local t = os.clock()
	streetCount = 0
	for o in pairs(Street) do
		if o.state ~= "street" then
			Street[o] = nil
		else
			streetCount = streetCount + 1
			o.x = o.x + C.WalkSpeed * dt
			if Boss and math.abs(o.x) < 14 then o.x = 14 end -- обходят Йети
			if o.x > 118 then
				Street[o] = nil
				destroyObj(o)
			else
				local bob = math.abs(math.sin((t + o.t0) * 7)) * 0.25
				o.root.CFrame = CFrame.new(o.x, 0.2 + 3 * o.scale + bob, o.z) * CFrame.Angles(0, -math.pi / 2, 0)
			end
		end
	end
	if Boss then
		Boss.root.CFrame = CFrame.new(0, Boss.y + math.abs(math.sin(t * 2)) * 0.6, 0) * CFrame.Angles(0, t * 0.4, 0)
	end
end)

task.spawn(function()
	while true do
		local rush = Ev and Ev.id == "rush"
		task.wait(rush and C.SpawnEveryRush or C.SpawnEvery)
		if streetCount < C.MaxStreet * (rush and 2 or 1) then spawnRandom() end
	end
end)

---------------------------------------------------------------- события и босс
local CC = Instance.new("ColorCorrectionEffect")
CC.Name = "EventTint"
CC.Parent = Lighting

local function removeBoss()
	if Boss then
		Boss.model:Destroy()
		Boss = nil
	end
end

local function endEvent()
	Ev = nil
	CC.TintColor = Color3.new(1, 1, 1)
	Net:FireAllClients("event", nil, 0)
	if Boss then
		removeBoss()
		Net:FireAllClients("toast", "bossLeft")
	end
end

local function spawnBoss()
	removeBoss()
	local scale = 4
	local m, hair = buildClient(BOSS_CID, nil, scale)
	m.Name = "Boss"
	local root = m.PrimaryPart
	local n = #Players:GetPlayers()
	local hp = math.max(C.BossMinHp, C.BossHpPerPlayer * n)
	Boss = { model = m, root = root, hair = hair, scale = scale, hp = hp, max = hp, hits = {}, y = 0.2 + 3 * scale }
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromOffset(260, 64)
	g.StudsOffset = Vector3.new(0, 20, 0)
	g.LightInfluence = 0
	g.AlwaysOnTop = true
	g.MaxDistance = 250
	g.Parent = root
	local nm = Instance.new("TextLabel")
	nm.BackgroundTransparency = 1
	nm.Size = UDim2.new(1, 0, 0, 30)
	nm.Font = Enum.Font.FredokaOne
	nm.TextScaled = true
	nm.TextColor3 = Color3.fromRGB(200, 235, 255)
	nm.Text = "YETI"
	nm:SetAttribute("L", "yeti")
	nm.Parent = g
	Instance.new("UIStroke", nm).Thickness = 2
	local bar = Instance.new("Frame")
	bar.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	bar.Position = UDim2.fromOffset(10, 36)
	bar.Size = UDim2.new(1, -20, 0, 22)
	bar.Parent = g
	Instance.new("UICorner", bar).CornerRadius = UDim.new(0, 8)
	local fill = Instance.new("Frame")
	fill.BackgroundColor3 = Color3.fromRGB(120, 220, 255)
	fill.Size = UDim2.fromScale(1, 1)
	fill.Parent = bar
	Instance.new("UICorner", fill).CornerRadius = UDim.new(0, 8)
	Boss.fill = fill
	sizeHair(Boss, 3)
	root.CFrame = CFrame.new(0, Boss.y, 0)
	m.Parent = Map
end

local function bossDown()
	local top, topN = nil, 0
	for p, n in pairs(Boss.hits) do
		if p.Parent and n > topN then top, topN = p, n end
	end
	local pos = Boss.root.Position
	burst(pos + Vector3.new(0, 12, 0), Color3.fromRGB(250, 252, 255), 40)
	for p, n in pairs(Boss.hits) do
		local st = S[p]
		if st and st.data and n >= C.BossMinHits then
			local v = math.floor(math.max(2000, ips(p) * 120))
			st.data.cash = st.data.cash + v
			toast(p, "bossReward", C.fmt(v))
			sendState(p)
		end
	end
	removeBoss()
	if top and S[top] then
		local st = S[top]
		local i = freeSeat(st)
		if i then
			seatObj(newObj(BOSS_CID, "none"), top, i)
		else
			local v = math.floor(C.Clients[BOSS_CID].price * C.SellRate)
			st.data.cash = st.data.cash + v
		end
		Net:FireAllClients("toast", "bossDown", top.DisplayName)
		sendState(top)
	end
	endEvent()
end

local function hitBoss(p)
	if not Boss then return end
	Boss.hits[p] = (Boss.hits[p] or 0) + 1
	Boss.hp = Boss.hp - 1
	Boss.fill.Size = UDim2.fromScale(math.max(0, Boss.hp / Boss.max), 1)
	sizeHair(Boss, 1 + 2 * math.max(0, Boss.hp / Boss.max))
	burst(Boss.root.Position + Vector3.new(math.random(-4, 4), 10, math.random(-4, 4)), Color3.fromRGB(250, 252, 255), 4)
	if Boss.hp <= 0 then bossDown() end
end

local function startEvent(id, dur)
	local e = C.Events[id]
	if not e then return end
	dur = dur or e.dur
	local my = { id = id, ends = now() + dur }
	Ev = my
	Net:FireAllClients("event", id, my.ends)
	if id == "balm" then
		CC.TintColor = Color3.fromRGB(205, 235, 255)
	elseif id == "rush" then
		CC.TintColor = Color3.fromRGB(255, 235, 210)
	elseif id == "boss" then
		CC.TintColor = Color3.fromRGB(215, 235, 255)
		spawnBoss()
	else
		CC.TintColor = Color3.fromRGB(240, 225, 255)
		spawnStar()
	end
	task.delay(dur, function()
		if Ev == my then endEvent() end
	end)
end

task.spawn(function()
	local k = 0
	while true do
		task.wait(C.EventEvery)
		if not Ev and #Players:GetPlayers() > 0 then
			k = k % #C.EventOrder + 1
			startEvent(C.EventOrder[k])
		end
	end
end)

---------------------------------------------------------------- машинка: бреем налысо
local ToolT = Instance.new("Tool")
ToolT.Name = "Clipper ✂"
ToolT.CanBeDropped = false
ToolT.RequiresHandle = true
ToolT.Grip = CFrame.new(0, 0, 0.4)
do
	local h = Instance.new("Part")
	h.Name = "Handle"
	h.Size = Vector3.new(0.6, 0.6, 1.8)
	h.Color = Color3.fromRGB(30, 30, 36)
	h.Material = Enum.Material.SmoothPlastic
	h.CanCollide = false
	h.Massless = true
	h.Parent = ToolT
	local blade = Instance.new("Part")
	blade.Name = "Blade"
	blade.Size = Vector3.new(0.8, 0.2, 0.4)
	blade.Color = Color3.fromRGB(220, 225, 235)
	blade.Material = Enum.Material.Metal
	blade.CanCollide = false
	blade.Massless = true
	blade.CFrame = h.CFrame * CFrame.new(0, 0, -1.05)
	local w = Instance.new("WeldConstraint")
	w.Part0 = h
	w.Part1 = blade
	w.Parent = blade
	blade.Parent = ToolT
	local stripe = Instance.new("Part")
	stripe.Name = "Stripe"
	stripe.Size = Vector3.new(0.62, 0.15, 1)
	stripe.Color = Color3.fromRGB(120, 255, 160)
	stripe.Material = Enum.Material.Neon
	stripe.CanCollide = false
	stripe.Massless = true
	stripe.CFrame = h.CFrame * CFrame.new(0, 0.25, 0.2)
	local w2 = Instance.new("WeldConstraint")
	w2.Part0 = h
	w2.Part1 = stripe
	w2.Parent = stripe
	stripe.Parent = ToolT
end

local function shave(p, q)
	local qs = S[q]
	local char = q.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local head = char and char:FindFirstChild("Head")
	if not qs or not hum or not head then return end
	if os.clock() < (qs.immuneUntil or 0) then toast(p, "shaveImmune", q.DisplayName) return end
	qs.immuneUntil = os.clock() + C.ShavedTime + C.ShaveImmune
	local stored = {}
	for _, a in ipairs(char:GetChildren()) do
		if a:IsA("Accessory") then
			table.insert(stored, a)
			a.Parent = nil
		end
	end
	burst(head.Position, Color3.fromRGB(90, 60, 40), 18)
	head.Reflectance = 0.6
	local tag = Instance.new("BillboardGui")
	tag.Name = "BaldTag"
	tag.Size = UDim2.fromOffset(160, 40)
	tag.StudsOffset = Vector3.new(0, 2.6, 0)
	tag.LightInfluence = 0
	tag.Parent = head
	local tl = Instance.new("TextLabel")
	tl.BackgroundTransparency = 1
	tl.Size = UDim2.fromScale(1, 1)
	tl.Font = Enum.Font.FredokaOne
	tl.TextScaled = true
	tl.TextColor3 = Color3.fromRGB(255, 230, 120)
	tl.Text = "BALD"
	tl:SetAttribute("L", "bald")
	tl.Parent = tag
	Instance.new("UIStroke", tl).Thickness = 2
	hum.WalkSpeed = C.ShaveSlowSpeed
	task.delay(C.ShaveSlowTime, function()
		if hum.Parent then hum.WalkSpeed = 16 end
	end)
	if qs.carry and qs.carry.from then returnToVictim(qs.carry) end
	toast(p, "shaveOk", q.DisplayName)
	toast(q, "shaved", p.DisplayName)
	task.delay(C.ShavedTime, function()
		if q.Character ~= char or not hum.Parent then return end
		for _, a in ipairs(stored) do
			pcall(function() hum:AddAccessory(a) end)
		end
		head.Reflectance = 0
		tag:Destroy()
	end)
end

local function onSwing(p, tool)
	local st = S[p]
	if not st then return end
	if os.clock() - (st.shaveT or 0) < C.ShaveCooldown then return end
	st.shaveT = os.clock()
	local hrp = p.Character and p.Character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	tool.Grip = CFrame.new(0, 0, 0.4) * CFrame.Angles(math.rad(-70), 0, 0)
	task.delay(0.15, function() tool.Grip = CFrame.new(0, 0, 0.4) end)
	if Boss then
		local d = (Boss.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
		if d.Magnitude < C.BossRange then
			hitBoss(p)
			return
		end
	end
	local best, bd
	for _, q in ipairs(Players:GetPlayers()) do
		local qc = q.Character
		local qh = qc and qc:FindFirstChild("HumanoidRootPart")
		local hum = qc and qc:FindFirstChildOfClass("Humanoid")
		if q ~= p and qh and hum and hum.Health > 0 then
			local dv = qh.Position - hrp.Position
			local dist = dv.Magnitude
			if dist < C.ShaveRange and (dist < 3 or hrp.CFrame.LookVector:Dot(dv.Unit) > 0.2) and (not bd or dist < bd) then
				best, bd = q, dist
			end
		end
	end
	if best then shave(p, best) end
end

local function giveTool(p)
	local bp = p:FindFirstChildOfClass("Backpack")
	if not bp or bp:FindFirstChild(ToolT.Name) then return end
	if p.Character and p.Character:FindFirstChild(ToolT.Name) then return end
	local t = ToolT:Clone()
	t.Activated:Connect(function() onSwing(p, t) end)
	t.Parent = bp
end

---------------------------------------------------------------- сохранения
local function defaultData()
	return { cash = C.StartCash, rebirths = 0, chairs = C.BaseChairs, lock = 0, seats = {}, idx = {}, codes = {},
		total = 0, kassa = 0, last = 0, rec = {}, luckUntil = 0 }
end

local function loadData(p)
	if not Store then return defaultData(), false end
	local ok, res
	for _ = 1, 3 do
		ok, res = pcall(function() return Store:GetAsync("u_" .. p.UserId) end)
		if ok then break end
		task.wait(2)
	end
	if not ok then return defaultData(), false end
	local d = defaultData()
	if type(res) == "table" then
		for k, v in pairs(res) do d[k] = v end
	end
	return d, true
end

local function saveData(p)
	local st = S[p]
	if not st or not st.data or st.noSave or not Store then return true end
	local d = st.data
	d.last = os.time()
	local list = {}
	for i, o in pairs(st.seats) do
		if o.state == "seat" then table.insert(list, { s = i, c = o.cid, c2 = o.cid2, m = o.mut, k = o.cut, g = o.grow }) end
	end
	d.seats = list
	local ok = pcall(function()
		Store:UpdateAsync("u_" .. p.UserId, function() return d end)
	end)
	if Board then
		pcall(function() Board:SetAsync(tostring(p.UserId), math.floor(math.min(d.total, 9e15))) end)
	end
	return ok
end

---------------------------------------------------------------- вход и выход
local function onCharacter(p, char)
	local st = S[p]
	if not st then return end
	local hrp = char:WaitForChild("HumanoidRootPart", 10)
	local hum = char:WaitForChild("Humanoid", 10)
	if not hrp or not hum or not S[p] then return end
	task.wait(0.1)
	char:PivotTo(st.plot.cf * CFrame.new(0, 4, -10))
	hum.Died:Connect(function() dropCarry(p, false) end)
	giveTool(p)
end

local function onJoin(p)
	local plot
	for _, pl in ipairs(PLOTS) do
		if not pl.owner then plot = pl break end
	end
	if not plot then p:Kick("Server is full, try another one") return end
	plot.owner = p
	plot.signText.Text = p.DisplayName
	if plot.lockPrompt then plot.lockPrompt:SetAttribute("Only", p.UserId) end
	p:SetAttribute("Plot", plot.i)
	local st = { plot = plot, seats = {}, pass = {}, carry = nil, lastAct = 0, lastSave = os.clock(), noSeatT = 0 }
	S[p] = st

	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	local cv = Instance.new("StringValue")
	cv.Name = "Cash"
	cv.Parent = ls
	local rv = Instance.new("IntValue")
	rv.Name = "Rebirths"
	rv.Parent = ls
	ls.Parent = p

	p.CharacterAdded:Connect(function(ch) onCharacter(p, ch) end)
	p.CharacterRemoving:Connect(function() dropCarry(p, false) end)

	local d, ok = loadData(p)
	if not p.Parent then plot.owner = nil return end
	st.data = d
	st.noSave = not ok

	for _, g in ipairs(C.Passes) do
		if g.id ~= 0 then
			local ok2, has = pcall(function() return MPS:UserOwnsGamePassAsync(p.UserId, g.id) end)
			st.pass[g.key] = ok2 and has or false
		end
	end
	setChairs(plot, chairsAvail(st))

	for _, e in ipairs(d.seats or {}) do
		if C.Clients[e.c] and (not e.c2 or C.Clients[e.c2]) and e.s and e.s <= chairsAvail(st) and not st.seats[e.s] then
			local o = newObj(e.c, (e.m and C.Mutations[e.m]) and e.m or "none", e.c2)
			o.cut = e.k and true or false
			o.owner = p
			setGrow(o, math.clamp(tonumber(e.g) or 0, 0, C.GrowMax))
			seatObj(o, p, e.s)
		end
	end

	if d.last and d.last > 0 then
		local dt = math.clamp(os.time() - d.last, 0, C.OfflineMax)
		local earn = math.floor(ips(p) * dt * C.OfflineRate)
		if earn >= 1 then
			d.kassa = d.kassa + earn
			st.offline = earn
		end
	end
	if p.Character then task.spawn(onCharacter, p, p.Character) end
	sendState(p)
end

local function onLeave(p)
	local st = S[p]
	if not st then return end
	dropCarry(p, true)
	if Boss then Boss.hits[p] = nil end
	for _, o in pairs(Objs) do
		if o.from == p then
			o.from = nil
			if o.tbPrompt then o.tbPrompt:Destroy() o.tbPrompt = nil end
		end
	end
	if st.data then saveData(p) end
	for _, o in pairs(st.seats) do
		if o.state == "seat" and o.owner == p then destroyObj(o) end
	end
	local plot = st.plot
	plot.owner = nil
	plot.signText.Text = ""
	if plot.lockPrompt then plot.lockPrompt:SetAttribute("Only", 0) end
	plot.lockedUntil = 0
	plot.laser.Transparency = 1
	plot.padText.Text = ""
	plot.btnText.Text = ""
	setChairs(plot, 0)
	S[p] = nil
end

---------------------------------------------------------------- касса, замок, доставка
for _, plot in ipairs(PLOTS) do
	local deb = 0
	plot.pad.Touched:Connect(function(hit)
		local p = Players:GetPlayerFromCharacter(hit.Parent)
		if not p or p ~= plot.owner or os.clock() - deb < 0.5 then return end
		deb = os.clock()
		local st = S[p]
		if not st or not st.data or st.data.kassa < 1 then return end
		local v = math.floor(st.data.kassa)
		st.data.cash = st.data.cash + v
		st.data.kassa = st.data.kassa - v
		toast(p, "collect", C.fmt(v))
		sendState(p)
	end)
	plot.lockPrompt = prompt(plot.btn, "lock", nil, 0, Enum.KeyCode.E, { Only = plot.owner and plot.owner.UserId or 0 }, function(p)
		if p ~= plot.owner then return end
		local st = S[p]
		if not st or not st.data then return end
		if os.clock() < plot.lockedUntil then return end
		local dur = C.lockDur(st.data.lock)
		plot.lockedUntil = os.clock() + dur
		plot.laser.Transparency = 0.45
		toast(p, "lockOn", dur)
	end)
end

Players.PlayerAdded:Connect(onJoin)
Players.PlayerRemoving:Connect(onLeave)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(onJoin, p) end

game:BindToClose(function()
	local left = 0
	for p in pairs(S) do
		left = left + 1
		task.spawn(function()
			saveData(p)
			left = left - 1
		end)
	end
	local t = os.clock()
	while left > 0 and os.clock() - t < 25 do task.wait(0.2) end
end)

task.spawn(function()
	while true do
		task.wait(0.2)
		local t = os.clock()
		for p, st in pairs(S) do
			local o = st.carry
			if o and o.state == "carried" then
				local char = p.Character
				local hrp = char and char:FindFirstChild("HumanoidRootPart")
				if hrp then
					local lp = st.plot.cf:PointToObjectSpace(hrp.Position)
					if math.abs(lp.X) < 21.5 and lp.Z > -20 and lp.Z < 20 and lp.Y < 25 then
						local i = freeSeat(st)
						if i then
							deliver(o, p, i)
						elseif t - st.noSeatT > 3 then
							st.noSeatT = t
							toast(p, "noSeat")
						end
					end
				end
				if st.carry == o and o.from and t - o.stolenAt > C.StealTimeout then returnToVictim(o) end
			end
		end
		-- выталкиваем чужих из закрытого барбершопа
		for _, plot in ipairs(PLOTS) do
			if plot.owner and t < plot.lockedUntil then
				for _, q in ipairs(Players:GetPlayers()) do
					if q ~= plot.owner and q.Character then
						local hrp = q.Character:FindFirstChild("HumanoidRootPart")
						if hrp then
							local lp = plot.cf:PointToObjectSpace(hrp.Position)
							if math.abs(lp.X) < 22 and lp.Z > -20 and lp.Z < 20 and lp.Y < 25 then
								hrp.CFrame = plot.cf * CFrame.new(math.clamp(lp.X, -18, 18), 4, -26)
							end
						end
					end
				end
			elseif plot.laser.Transparency < 1 then
				plot.laser.Transparency = 1
			end
		end
	end
end)

-- доход раз в секунду
task.spawn(function()
	while true do
		task.wait(1)
		for p, st in pairs(S) do
			if st.data then
				local v = ips(p)
				st.data.kassa = st.data.kassa + v
				st.data.total = st.data.total + v
				st.plot.padText.Text = "$" .. C.fmt(st.data.kassa)
				local left = st.plot.lockedUntil - os.clock()
				st.plot.btnText.Text = left > 0 and ("🔒 " .. math.ceil(left)) or "🔓"
				sendState(p)
				if os.clock() - st.lastSave > 90 then
					st.lastSave = os.clock()
					task.spawn(saveData, p)
				end
			end
		end
	end
end)

-- причёски растут
task.spawn(function()
	while true do
		task.wait(C.GrowEvery)
		for _, st in pairs(S) do
			for _, o in pairs(st.seats) do
				if o.state == "seat" and o.grow < C.GrowMax then
					setGrow(o, o.grow + 1)
					if o.grow == C.TrimMin then makePrompts(o) else refreshPromptValues(o) end
				end
			end
		end
	end
end)

-- таблица лидеров
local nameCache = {}
task.spawn(function()
	while Board do
		local ok, pages = pcall(function() return Board:GetSortedAsync(false, 10) end)
		if ok and pages then
			local items = pages:GetCurrentPage()
			for i = 1, 10 do
				local e = items[i]
				if e then
					local id = tonumber(e.key)
					local name = nameCache[id]
					if not name then
						local ok2, n = pcall(function() return Players:GetNameFromUserIdAsync(id) end)
						name = ok2 and n or "?"
						nameCache[id] = name
					end
					boardRows[i].Text = i .. ". " .. name .. "   $" .. C.fmt(e.value)
				else
					boardRows[i].Text = ""
				end
			end
		end
		task.wait(120)
	end
end)

---------------------------------------------------------------- действия из интерфейса
Net.OnServerEvent:Connect(function(p, kind, a)
	local st = S[p]
	if not st or not st.data then return end
	if os.clock() - st.lastAct < 0.25 then return end
	st.lastAct = os.clock()
	local d = st.data
	if kind == "ready" then
		sendState(p)
		if Ev then Net:FireClient(p, "event", Ev.id, Ev.ends) end
		if st.offline then
			toast(p, "offline", C.fmt(st.offline))
			st.offline = nil
		end
		if st.noSave then toast(p, "nosave") end
	elseif kind == "upgrade" then
		if a == "chairs" then
			if d.chairs >= C.MaxChairs then toast(p, "maxed") return end
			local cost = C.chairCost(d.chairs)
			if d.cash < cost then toast(p, "noMoney") return end
			d.cash = d.cash - cost
			d.chairs = d.chairs + 1
			setChairs(st.plot, chairsAvail(st))
			toast(p, "upgraded")
		elseif a == "lock" then
			if d.lock >= C.MaxLock then toast(p, "maxed") return end
			local cost = C.lockCost(d.lock)
			if d.cash < cost then toast(p, "noMoney") return end
			d.cash = d.cash - cost
			d.lock = d.lock + 1
			toast(p, "upgraded")
		end
	elseif kind == "rebirth" then
		local cost = C.rebirthCost(d.rebirths)
		if d.cash < cost then toast(p, "rebirthNo", C.fmt(cost)) return end
		if st.carry then toast(p, "handsFull") return end
		clearSel(st)
		for _, o in pairs(st.seats) do
			if o.state == "seat" then
				destroyObj(o)
			else
				o.from = nil
				if o.tbPrompt then o.tbPrompt:Destroy() o.tbPrompt = nil end
			end
		end
		st.seats = {}
		d.cash = C.StartCash
		d.kassa = 0
		d.rebirths = d.rebirths + 1
		toast(p, "rebirthed", tostring(C.rebirthMult(d.rebirths)))
		task.spawn(saveData, p)
	elseif kind == "code" then
		if type(a) ~= "string" or #a > 30 then return end
		local code = string.upper((string.gsub(a, "%s", "")))
		local r = C.Codes[code]
		if not r then toast(p, "codeBad") return end
		if d.codes[code] then toast(p, "codeUsed") return end
		d.codes[code] = true
		if r.cash then d.cash = d.cash + r.cash end
		if r.luck then d.luckUntil = math.max(d.luckUntil or 0, os.time()) + r.luck end
		toast(p, "codeOk")
	end
	sendState(p)
end)

---------------------------------------------------------------- админ-команды в чате
-- !event boss|rush|balm|star, !cash 1000000, !spawn 19, !grow (все твои причёски на максимум)
local function isAdmin(p)
	if RunService:IsStudio() then return true end
	if game.CreatorType == Enum.CreatorType.User and p.UserId == game.CreatorId then return true end
	if game.CreatorType == Enum.CreatorType.Group then
		local ok, rank = pcall(function() return p:GetRankInGroup(game.CreatorId) end)
		if ok and rank == 255 then return true end
	end
	for _, id in ipairs(C.Admins) do
		if id == p.UserId then return true end
	end
	return false
end

local function hookChat(p)
	p.Chatted:Connect(function(msg)
		if not isAdmin(p) then return end
		local cmd, arg = string.match(msg, "^!(%w+)%s*(.*)$")
		local st = S[p]
		if cmd == "event" then
			if Ev then endEvent() end
			startEvent(arg ~= "" and arg or "boss")
		elseif cmd == "cash" and st and st.data then
			st.data.cash = st.data.cash + (tonumber(arg) or 100000)
			sendState(p)
		elseif cmd == "spawn" then
			local cid = tonumber(arg)
			if cid and C.Clients[cid] then spawnStreet(cid, nil) end
		elseif cmd == "grow" and st then
			for _, o in pairs(st.seats) do
				if o.state == "seat" then
					setGrow(o, C.GrowMax)
					makePrompts(o)
				end
			end
		end
	end)
end
Players.PlayerAdded:Connect(hookChat)
for _, p in ipairs(Players:GetPlayers()) do hookChat(p) end

---------------------------------------------------------------- покупки за робуксы
local PASSKEY = {}
for _, g in ipairs(C.Passes) do
	if g.id ~= 0 then PASSKEY[g.id] = g.key end
end
local PRODKEY = {}
for _, pr in ipairs(C.Products) do
	if pr.id ~= 0 then PRODKEY[pr.id] = pr.key end
end

MPS.PromptGamePassPurchaseFinished:Connect(function(p, id, bought)
	local st = S[p]
	if not bought or not st or not PASSKEY[id] then return end
	st.pass[PASSKEY[id]] = true
	setChairs(st.plot, chairsAvail(st))
	toast(p, "thanks")
	sendState(p)
end)

MPS.ProcessReceipt = function(info)
	local p = Players:GetPlayerByUserId(info.PlayerId)
	local st = p and S[p]
	if not st or not st.data then return Enum.ProductPurchaseDecision.NotProcessedYet end
	local d = st.data
	for _, id in ipairs(d.rec) do
		if id == info.PurchaseId then return Enum.ProductPurchaseDecision.PurchaseGranted end
	end
	local key = PRODKEY[info.ProductId]
	if not key then return Enum.ProductPurchaseDecision.NotProcessedYet end
	if key == "cash1" or key == "cash2" then
		local v = productCash(p, PROD[key])
		d.cash = d.cash + v
		toast(p, "cash", C.fmt(v))
	elseif key == "luck10" then
		d.luckUntil = math.max(d.luckUntil or 0, os.time()) + 600
		toast(p, "luckOn")
	elseif key == "rush" then
		if Ev then endEvent() end
		startEvent("rush", C.PaidRushDur)
		Net:FireAllClients("toast", "paidRush", p.DisplayName)
	end
	table.insert(d.rec, info.PurchaseId)
	while #d.rec > 30 do table.remove(d.rec, 1) end
	if not saveData(p) and not st.noSave then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	sendState(p)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end
