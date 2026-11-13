-- Мини-имитация Roblox для прогонов логики. Не физика: только объекты, сигналы, время, сохранения.
local M = {}
M.errors = {}
M.log = {}
local NOW = 0
M.now = function() return NOW end

---------------------------------------------------------------- планировщик
local queue = {} -- {t, co, args}
local function report(co, err)
	table.insert(M.errors, tostring(err) .. "\n" .. debug.traceback(co))
end
local function resume(co, ...)
	local ok, res = coroutine.resume(co, ...)
	if not ok then report(co, res) return end
	if coroutine.status(co) == "suspended" then
		local w = (type(res) == "number") and res or 0
		table.insert(queue, { t = NOW + w, co = co })
	end
end
M.resume = resume
task = {}
function task.spawn(f, ...)
	local co = type(f) == "thread" and f or coroutine.create(f)
	resume(co, ...)
	return co
end
function task.defer(f, ...)
	local args = table.pack(...)
	local co = coroutine.create(function() return f(table.unpack(args, 1, args.n)) end)
	table.insert(queue, { t = NOW, co = co })
	return co
end
function task.delay(t, f, ...)
	local args = table.pack(...)
	local co = coroutine.create(function() return f(table.unpack(args, 1, args.n)) end)
	table.insert(queue, { t = NOW + (t or 0), co = co })
	return co
end
function task.wait(t)
	if not coroutine.isyieldable() then error("task.wait outside coroutine") end
	coroutine.yield(t or 0.03)
	return t
end
local Heartbeat -- сигнал, задаётся ниже
function M.advance(sec, step)
	step = step or 0.1
	local target = NOW + sec
	while NOW < target - 1e-9 do
		NOW = math.min(target, NOW + step)
		if Heartbeat then Heartbeat:Fire(step) end
		local guard = 0
		while true do
			guard = guard + 1
			if guard > 100000 then error("scheduler loop") end
			local idx
			for i, q in ipairs(queue) do
				if q.t <= NOW and (not idx or q.t < queue[idx].t) then idx = i end
			end
			if not idx then break end
			local q = table.remove(queue, idx)
			resume(q.co)
		end
	end
end
os.clock = function() return NOW end
local T0 = 1800000000
os.time = function() return T0 + math.floor(NOW) end
M.setEpoch = function(t) T0 = t end

---------------------------------------------------------------- сигналы
local Signal = {}
Signal.__index = Signal
function Signal.new() return setmetatable({ h = {} }, Signal) end
function Signal:Connect(f)
	local c = { f = f, on = true }
	table.insert(self.h, c)
	return { Disconnect = function() c.on = false end }
end
function Signal:Fire(...)
	for _, c in ipairs(self.h) do
		if c.on then task.spawn(c.f, ...) end
	end
end
M.Signal = Signal

---------------------------------------------------------------- math-типы
local V3 = {}
V3.__index = function(v, k)
	if k == "Magnitude" then return math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z) end
	if k == "Unit" then local m = math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z); if m == 0 then return v end return Vector3.new(v.X / m, v.Y / m, v.Z / m) end
	if k == "Dot" then return function(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end end
	return nil
end
local function isV(x) return getmetatable(x) == V3 end
V3.__add = function(a, b) return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
V3.__sub = function(a, b) return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
V3.__unm = function(a) return Vector3.new(-a.X, -a.Y, -a.Z) end
V3.__mul = function(a, b)
	if type(a) == "number" then a, b = b, a end
	if type(b) == "number" then return Vector3.new(a.X * b, a.Y * b, a.Z * b) end
	assert(isV(b), "Vector3 * bad type")
	return Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V3.__div = function(a, b) return Vector3.new(a.X / b, a.Y / b, a.Z / b) end
V3.__eq = function(a, b) return a.X == b.X and a.Y == b.Y and a.Z == b.Z end
V3.__tostring = function(v) return string.format("(%.2f,%.2f,%.2f)", v.X, v.Y, v.Z) end
Vector3 = { new = function(x, y, z)
	assert(type(x or 0) == "number" and type(y or 0) == "number" and type(z or 0) == "number", "Vector3.new needs numbers")
	return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V3)
end }
Vector3.zero = Vector3.new()
Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0, __t = "Vector2" } end }

local CFm = {}
local function cf(R, p) return setmetatable({ R = R, p = p }, CFm) end
local I3 = { 1, 0, 0, 0, 1, 0, 0, 0, 1 }
local function mm(A, B)
	local C = {}
	for i = 0, 2 do
		for j = 0, 2 do
			C[i * 3 + j + 1] = A[i * 3 + 1] * B[j + 1] + A[i * 3 + 2] * B[3 + j + 1] + A[i * 3 + 3] * B[6 + j + 1]
		end
	end
	return C
end
local function mv(A, v)
	return Vector3.new(A[1] * v.X + A[2] * v.Y + A[3] * v.Z, A[4] * v.X + A[5] * v.Y + A[6] * v.Z, A[7] * v.X + A[8] * v.Y + A[9] * v.Z)
end
local function tr(A) return { A[1], A[4], A[7], A[2], A[5], A[8], A[3], A[6], A[9] } end
CFm.__index = function(c, k)
	if k == "Position" then return c.p end
	if k == "LookVector" then return Vector3.new(-c.R[3], -c.R[6], -c.R[9]) end
	if k == "X" then return c.p.X end
	if k == "Y" then return c.p.Y end
	if k == "Z" then return c.p.Z end
	if k == "Rotation" then return cf(c.R, Vector3.new()) end
	if k == "PointToObjectSpace" then return function(self, v) return mv(tr(self.R), v - self.p) end end
	if k == "Inverse" then return function(self) local Rt = tr(self.R); return cf(Rt, -mv(Rt, self.p)) end end
	return nil
end
CFm.__mul = function(a, b)
	assert(getmetatable(a) == CFm, "CFrame * : left is not CFrame")
	if getmetatable(b) == CFm then return cf(mm(a.R, b.R), mv(a.R, b.p) + a.p) end
	if isV(b) then return mv(a.R, b) + a.p end
	error("CFrame * bad type " .. type(b))
end
CFm.__add = function(a, v) assert(isV(v)); return cf(a.R, a.p + v) end
CFm.__sub = function(a, v) assert(isV(v), "CFrame - needs Vector3"); return cf(a.R, a.p - v) end
local function rx(a) local c, s = math.cos(a), math.sin(a); return { 1, 0, 0, 0, c, -s, 0, s, c } end
local function ry(a) local c, s = math.cos(a), math.sin(a); return { c, 0, s, 0, 1, 0, -s, 0, c } end
local function rz(a) local c, s = math.cos(a), math.sin(a); return { c, -s, 0, s, c, 0, 0, 0, 1 } end
CFrame = {
	new = function(x, y, z)
		if isV(x) then return cf(I3, x) end
		return cf(I3, Vector3.new(x or 0, y or 0, z or 0))
	end,
	Angles = function(a, b, c) return cf(mm(mm(rx(a), ry(b)), rz(c)), Vector3.new()) end,
	lookAt = function(at, target)
		local f = (target - at).Unit
		local up = Vector3.new(0, 1, 0)
		local r = Vector3.new(f.Y * up.Z - f.Z * up.Y, f.Z * up.X - f.X * up.Z, f.X * up.Y - f.Y * up.X).Unit
		local u = Vector3.new(r.Y * f.Z - r.Z * f.Y, r.Z * f.X - r.X * f.Z, r.X * f.Y - r.Y * f.X)
		return cf({ r.X, u.X, -f.X, r.Y, u.Y, -f.Y, r.Z, u.Z, -f.Z }, at)
	end,
}
CFrame.identity = CFrame.new()

Color3 = {
	new = function(r, g, b) return { R = r or 0, G = g or 0, B = b or 0, __t = "Color3" } end,
	fromRGB = function(r, g, b)
		assert(r and g and b, "fromRGB needs 3 numbers")
		return { R = r / 255, G = g / 255, B = b / 255, __t = "Color3" }
	end,
	fromHSV = function(h, s, v) return { R = v, G = v, B = v, __t = "Color3" } end,
}
UDim = { new = function(s, o) return { Scale = s, Offset = o } end }
UDim2 = {
	new = function(a, b, c, d) return { a, b, c, d, __t = "UDim2" } end,
	fromOffset = function(a, b) return { 0, a, 0, b, __t = "UDim2" } end,
	fromScale = function(a, b) return { a, 0, b, 0, __t = "UDim2" } end,
}
ColorSequence = { new = function(...) return { ... } end }
ColorSequenceKeypoint = { new = function(...) return { ... } end }
NumberSequence = { new = function(...) return { ... } end }
NumberRange = { new = function(...) return { ... } end }
TweenInfo = { new = function(...) return { ... } end }
math.clamp = function(x, a, b) assert(a <= b, "math.clamp min > max"); return math.max(a, math.min(b, x)) end

Enum = setmetatable({}, { __index = function(_, cat)
	return setmetatable({}, { __index = function(_, item) return "Enum." .. cat .. "." .. item end })
end })

---------------------------------------------------------------- Instance
local EVENTS = { Triggered = 1, Touched = 1, Activated = 1, Died = 1, CharacterAdded = 1, CharacterRemoving = 1, Chatted = 1,
	OnServerEvent = 1, OnClientEvent = 1, AttributeChanged = 1, AncestryChanged = 1, ChildAdded = 1, DescendantAdded = 1,
	PlayerAdded = 1, PlayerRemoving = 1, PromptGamePassPurchaseFinished = 1, Heartbeat = 1, RenderStepped = 1, Changed = 1, FocusLost = 1 }
local PARENTS = {
	Part = { "BasePart", "PVInstance" }, SpawnLocation = { "Part", "BasePart", "PVInstance" }, Model = { "PVInstance" },
	TextLabel = { "GuiObject", "GuiBase2d" }, TextButton = { "GuiButton", "GuiObject" }, ImageButton = { "GuiButton", "GuiObject" },
	Frame = { "GuiObject" }, ScrollingFrame = { "GuiObject" }, TextBox = { "GuiObject" }, Folder = {}, Accessory = { "Accoutrement" },
	Script = { "BaseScript", "LuaSourceContainer" }, LocalScript = { "Script", "BaseScript" }, ModuleScript = { "LuaSourceContainer" },
}
local Inst = {}
local INST_MT = {}
M.instances = 0
local function isInst(x) return type(x) == "table" and getmetatable(x) == INST_MT end
M.isInst = isInst
local function newInstance(class)
	M.instances = M.instances + 1
	local o = setmetatable({ __p = { Name = class, ClassName = class }, __c = {}, __a = {}, __s = {}, __class = class }, INST_MT)
	return o
end
local function fireDesc(root, child)
	local anc = root
	while anc do
		if anc.__s.DescendantAdded then
			anc.__s.DescendantAdded:Fire(child)
			for _, d in ipairs(child:GetDescendants()) do anc.__s.DescendantAdded:Fire(d) end
		end
		anc = anc.__p.Parent
	end
end
local SPECIAL = {}
SPECIAL.Position = { get = function(o)
		if not o.__p.CFrame then return o.__p.__pos end
		return o.__p.CFrame.p
	end,
	set = function(o, v)
		if not o.__p.CFrame then o.__p.__pos = v return end
		o.__p.CFrame = CFrame.new(v) * o.__p.CFrame.Rotation
	end }
SPECIAL.Parent = { get = function(o) return o.__p.Parent end, set = function(o, par)
	if rawget(o, "__destroyed") and par then error("The Parent property of " .. o.__p.Name .. " is locked") end
	local old = o.__p.Parent
	if old then
		for i, c in ipairs(old.__c) do if c == o then table.remove(old.__c, i) break end end
	end
	o.__p.Parent = par
	if par then
		assert(isInst(par), "Parent must be Instance")
		table.insert(par.__c, o)
		if par.__s.ChildAdded then par.__s.ChildAdded:Fire(o) end
		fireDesc(par, o)
	end
	if o.__s.AncestryChanged then o.__s.AncestryChanged:Fire(o, par) end
end }
INST_MT.__index = function(o, k)
	if Inst[k] then return Inst[k] end
	if SPECIAL[k] then return SPECIAL[k].get(o) end
	local v = o.__p[k]
	if v ~= nil then return v end
	if EVENTS[k] then
		o.__s[k] = o.__s[k] or Signal.new()
		return o.__s[k]
	end
	local mt = rawget(o, "__methods")
	if mt and mt[k] then return mt[k] end
	-- дочерний объект по имени
	for _, c in ipairs(o.__c) do if c.__p.Name == k then return c end end
	return nil
end
INST_MT.__newindex = function(o, k, v)
	if SPECIAL[k] then return SPECIAL[k].set(o, v) end
	if k:sub(1, 2) == "__" then rawset(o, k, v) return end
	o.__p[k] = v
end
INST_MT.__tostring = function(o) return o.__p.Name end
function Inst:FindFirstChild(n) for _, c in ipairs(self.__c) do if c.__p.Name == n then return c end end return nil end
function Inst:WaitForChild(n) return self:FindFirstChild(n) end
function Inst:FindFirstChildOfClass(cl) for _, c in ipairs(self.__c) do if c.__class == cl then return c end end return nil end
function Inst:GetChildren() local t = {}; for i, c in ipairs(self.__c) do t[i] = c end return t end
function Inst:GetDescendants()
	local t = {}
	local function rec(x) for _, c in ipairs(x.__c) do table.insert(t, c); rec(c) end end
	rec(self)
	return t
end
function Inst:IsA(cl)
	if self.__class == cl or cl == "Instance" then return true end
	for _, p in ipairs(PARENTS[self.__class] or {}) do if p == cl then return true end end
	return false
end
function Inst:IsDescendantOf(a) local p = self.__p.Parent; while p do if p == a then return true end p = p.__p.Parent end return false end
function Inst:Destroy()
	for _, c in ipairs(self:GetChildren()) do c:Destroy() end
	if self.__p.Parent then self.Parent = nil end
	self.__destroyed = true
end
function Inst:ClearAllChildren() for _, c in ipairs(self:GetChildren()) do c:Destroy() end end
function Inst:SetAttribute(k, v)
	if v ~= nil then
		local tv = type(v)
		assert(tv == "number" or tv == "string" or tv == "boolean" or (tv == "table" and (v.__t or isV(v))), "SetAttribute: bad value type for " .. k .. ": " .. tv)
	end
	self.__a[k] = v
	if self.__s.AttributeChanged then self.__s.AttributeChanged:Fire(k) end
	if self.__s["A:" .. k] then self.__s["A:" .. k]:Fire() end
end
function Inst:GetAttribute(k) return self.__a[k] end
function Inst:GetAttributeChangedSignal(k) self.__s["A:" .. k] = self.__s["A:" .. k] or Signal.new(); return self.__s["A:" .. k] end
function Inst:GetPropertyChangedSignal(k) self.__s["P:" .. k] = self.__s["P:" .. k] or Signal.new(); return self.__s["P:" .. k] end
function Inst:Clone()
	local n = newInstance(self.__class)
	for k, v in pairs(self.__p) do if k ~= "Parent" then n.__p[k] = v end end
	for k, v in pairs(self.__a) do n.__a[k] = v end
	for _, c in ipairs(self.__c) do local cc = c:Clone(); cc.Parent = n end
	return n
end
function Inst:PivotTo(c)
	local pp = self.__p.PrimaryPart or self:FindFirstChild("HumanoidRootPart")
	if pp then pp.CFrame = c end
end
function Inst:GetPivot() local pp = self.__p.PrimaryPart; return pp and pp.CFrame or CFrame.new() end

Instance = {
	new = function(class, parent)
		local o = newInstance(class)
		if class == "Part" or class == "SpawnLocation" then
			o.__p.CFrame = CFrame.new(); o.__p.Size = Vector3.new(4, 1, 2); o.__p.Transparency = 0; o.__p.Anchored = false
			o.__p.Reflectance = 0
		elseif class == "Humanoid" then
			o.__p.Health = 100; o.__p.WalkSpeed = 16
		elseif class == "BillboardGui" or class == "SurfaceGui" or class == "ScreenGui" then
		elseif class == "ScrollingFrame" then
			o.__p.CanvasPosition = Vector2.new(0, 0)
		elseif class == "Tool" then
			o.__p.Grip = CFrame.new()
		elseif class == "Sound" then
			o.__methods = { Play = function() end, Stop = function() end }
		elseif class == "RemoteEvent" then
			o.__methods = {
				FireClient = function(self, p, ...) assert(M.isInst(p), "FireClient needs player"); M.fireClient(p, ...) end,
				FireAllClients = function(self, ...) M.fireAll(...) end,
				FireServer = function(self, ...) M.fireServer(...) end,
			}
		end
		if parent then o.Parent = parent end
		return o
	end,
}
M.newInstance = newInstance
M.Signal = Signal
function M.setHeartbeat(s) Heartbeat = s end
return M
