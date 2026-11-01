# Прогон тестов игры на имитации Roblox: python3 tests/run.py   (нужен pip install lupa)
import os, sys
from lupa import LuaRuntime
D = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(D, "..", "src")
src = lambda n: open(os.path.join(SRC, n), encoding="utf-8").read()
def runtime():
    lua = LuaRuntime(unpack_returned_tuples=True); g = lua.globals()
    g.M = lua.execute(open(os.path.join(D, "mock.lua"), encoding="utf-8").read())
    g.CONFIG_SRC = src("Config.lua")
    return lua, g
for t in ["server_test.lua", "edge_test.lua"]:
    print("#####", t)
    lua, g = runtime()
    g.E = lua.execute(open(os.path.join(D, "env.lua"), encoding="utf-8").read())
    g.SERVER_SRC = src("GameServer.server.lua")
    lua.execute(open(os.path.join(D, t), encoding="utf-8").read())
for loc in ["ru-ru", "en-us"]:
    print("##### client_test.lua", loc)
    lua, g = runtime()
    g.CLIENT_SRC = src("ClientUI.client.lua"); g.LOCALE = loc
    lua.execute(open(os.path.join(D, "client_test.lua"), encoding="utf-8").read())
