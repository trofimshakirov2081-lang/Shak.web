-- Окружение сервера: game, workspace, сервисы, игроки. Требует mock.lua (глобал M).
local E = {}
local new = M.newInstance

-- проверка, что сохраняемые данные можно сохранить в DataStore (JSON)
local function checkJSON(v, path, seen)
	local t = type(v)
	if t == "number" then
		if v ~= v or v == math.huge or v == -math.huge then error("DataStore: NaN/inf at " .. path) end
		return
	end
	if t == "string" or t == "boolean" or t == "nil" then return end
	if t ~= "table" then error("DataStore: bad type " .. t .. " at " .. path) end
	if getmetatable(v) then error("DataStore: Roblox object at " .. path) end
	seen = seen or {}
	if seen[v] then error("DataStore: cycle at " .. path) end
	seen[v] = true
	local n, strk, numk = 0, false, false
	for k, x in pairs(v) do
		n = n + 1
		if type(k) == "string" then strk = true elseif type(k) == "number" then numk = true else error("DataStore: key type at " .. path) end
		checkJSON(x, path .. "." .. tostring(k), seen)
	end
	if strk and numk then error("DataStore: mixed keys at " .. path) end
	if numk and #v ~= n then error("DataStore: sparse array at " .. path) end
	seen[v] = nil
end
local function deep(v)
	if type(v) ~= "table" then return v end
	local t = {}
	for k, x in pairs(v) do t[k] = deep(x) end
	return t
end

game = new("DataModel")
workspace = new("Workspace")
workspace.Name = "Workspace"
workspace.Parent = game
workspace.__methods = { GetServerTimeNow = function() return 1000 + M.now() end }
local services = {}
local function svc(name)
	if not services[name] then
		local s = new(name)
		s.Name = name
		s.Parent = game
		services[name] = s
	end
	return services[name]
end
game.__methods = {
	GetService = function(_, n) if n == "Workspace" then return workspace end return svc(n) end,
	BindToClose = function(_, f) E.onClose = f end,
}
game.CreatorType = "Enum.CreatorType.User"
game.CreatorId = 0

local Players = svc("Players")
local RunService = svc("RunService")
local hb = M.Signal.new()
RunService.__p.Heartbeat = hb
RunService.__p.RenderStepped = M.Signal.new()
M.setHeartbeat(hb)
E.studio = true
RunService.__methods = { IsStudio = function() return E.studio end, IsServer = function() return true end }
svc("Debris").__methods = { AddItem = function(_, o, t) task.delay(t, function() o:Destroy() end) end }
svc("TweenService").__methods = { Create = function() return { Play = function() end } end }

-- DataStore в памяти
E.store = {}
E.ordered = {}
E.dsFail = false
local DSS = svc("DataStoreService")
DSS.__methods = {
	GetDataStore = function(_, name)
		return {
			GetAsync = function(_, key)
				if E.dsFail then error("DataStore request failed") end
				return deep(E.store[key])
			end,
			UpdateAsync = function(_, key, fn)
				if E.dsFail then error("DataStore request failed") end
				local nv = fn(deep(E.store[key]))
				checkJSON(nv, key)
				E.store[key] = deep(nv)
				E.saves = (E.saves or 0) + 1
				return nv
			end,
		}
	end,
	GetOrderedDataStore = function()
		return {
			SetAsync = function(_, k, v)
				assert(type(v) == "number" and math.floor(v) == v, "OrderedDataStore needs integer, got " .. tostring(v))
				E.ordered[k] = v
			end,
			GetSortedAsync = function()
				local arr = {}
				for k, v in pairs(E.ordered) do table.insert(arr, { key = k, value = v }) end
				table.sort(arr, function(a, b) return a.value > b.value end)
				return { GetCurrentPage = function() return arr end }
			end,
		}
	end,
}

-- MarketplaceService
local MPS = svc("MarketplaceService")
E.owned = {}
MPS.__methods = {
	UserOwnsGamePassAsync = function(_, uid, id) return E.owned[uid .. ":" .. id] or false end,
	PromptGamePassPurchase = function() end, PromptProductPurchase = function() end,
}
MPS.__p.PromptGamePassPurchaseFinished = M.Signal.new()

svc("Lighting")
svc("ReplicatedStorage")
svc("ServerScriptService")

-- игроки
E.msgs = {} -- что сервер отправил клиентам: msgs[player] = {{...}}
Players.__methods = {
	GetPlayers = function()
		local t = {}
		for _, c in ipairs(Players.__c) do if c.__class == "Player" then table.insert(t, c) end end
		return t
	end,
	GetPlayerFromCharacter = function(_, ch)
		for _, c in ipairs(Players.__c) do if c.__class == "Player" and c.Character == ch and ch ~= nil then return c end end
		return nil
	end,
	GetPlayerByUserId = function(_, id)
		for _, c in ipairs(Players.__c) do if c.__class == "Player" and c.UserId == id then return c end end
		return nil
	end,
	GetNameFromUserIdAsync = function(_, id) return "user" .. id end,
}

function E.spawnChar(p)
	local ch = new("Model")
	ch.Name = p.Name
	local hrp = Instance.new("Part")
	hrp.Name = "HumanoidRootPart"
	hrp.CFrame = CFrame.new(0, 3, 0)
	hrp.Parent = ch
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Parent = ch
	local hum = Instance.new("Humanoid")
	hum.Name = "Humanoid"
	hum.__methods = { AddAccessory = function(self, a) a.Parent = ch end, TakeDamage = function() end }
	hum.Parent = ch
	for i = 1, 2 do
		local a = new("Accessory")
		a.Name = "Hat" .. i
		a.Parent = ch
	end
	ch.PrimaryPart = hrp
	local bp = p:FindFirstChildOfClass("Backpack")
	if bp then bp:Destroy() end
	local nb = new("Backpack")
	nb.Name = "Backpack"
	nb.Parent = p
	p.Character = ch
	ch.Parent = workspace
	p.CharacterAdded:Fire(ch)
	return ch
end

function E.kill(p)
	local ch = p.Character
	local hum = ch:FindFirstChildOfClass("Humanoid")
	hum.Health = 0
	hum.Died:Fire()
end
function E.respawn(p)
	local old = p.Character
	if old then
		p.CharacterRemoving:Fire(old)
		M.advance(0.05)
		old:Destroy()
	end
	E.spawnChar(p)
end

function E.join(name, uid)
	local p = new("Player")
	p.Name = name
	p.DisplayName = name
	p.UserId = uid
	p.LocaleId = "ru-ru"
	p.__methods = {
		Kick = function(self, m) E.kicked = (E.kicked or 0) + 1; self.Parent = nil end,
		GetRankInGroup = function() return 0 end,
	}
	E.msgs[p] = {}
	p.Parent = Players
	Players.PlayerAdded:Fire(p)
	E.spawnChar(p)
	return p
end

function E.leave(p)
	local ch = p.Character
	if ch then p.CharacterRemoving:Fire(ch) end
	M.advance(0.05)
	Players.PlayerRemoving:Fire(p)
	M.advance(0.05)
	p.Parent = nil
	if ch then ch:Destroy() end
end

E.svc = svc
E.Players = Players
E.MPS = MPS
return E
