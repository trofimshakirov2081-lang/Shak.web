# Собирает MutantBarber.rbxlx из src/*.lua: python3 build.py
import os
D = os.path.dirname(os.path.abspath(__file__))
src = lambda n: open(os.path.join(D, "src", n), encoding="utf-8").read()
n = [0]
def ref():
    n[0] += 1
    return "RBX%08X" % n[0]
def script(cls, name, code):
    assert "]]>" not in code
    return f'<Item class="{cls}" referent="{ref()}"><Properties><string name="Name">{name}</string><ProtectedString name="Source"><![CDATA[{code}]]></ProtectedString></Properties></Item>'
def svc(cls, inner="", props=""):
    return f'<Item class="{cls}" referent="{ref()}"><Properties><string name="Name">{cls}</string>{props}</Properties>{inner}</Item>'
xml = ['<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    svc("Workspace", props='<bool name="StreamingEnabled">false</bool>'),
    svc("ReplicatedStorage", script("ModuleScript", "Config", src("Config.lua"))),
    svc("ServerScriptService", script("Script", "GameServer", src("GameServer.server.lua"))),
    svc("StarterPlayer", svc("StarterPlayerScripts", script("LocalScript", "ClientUI", src("ClientUI.client.lua")))),
    '</roblox>']
out = os.path.join(D, "MutantBarber.rbxlx")
open(out, "w", encoding="utf-8").write("\n".join(xml))
print("ok", out, os.path.getsize(out))
