#!/usr/bin/python3
"""Test only: a minimal org.kde.StatusNotifierWatcher, standing in for the one inside Cutefish's
top bar, which runs only with a real display. It records which tray items register, so a test can
check that ShulGo announces itself the way Cutefish's tray expects. It draws nothing."""
from gi.repository import Gio, GLib

XML = """<node><interface name="org.kde.StatusNotifierWatcher">
<method name="RegisterStatusNotifierItem"><arg type="s" direction="in"/></method>
<method name="RegisterStatusNotifierHost"><arg type="s" direction="in"/></method>
<property name="RegisteredStatusNotifierItems" type="as" access="read"/>
<property name="IsStatusNotifierHostRegistered" type="b" access="read"/>
<property name="ProtocolVersion" type="i" access="read"/>
<signal name="StatusNotifierItemRegistered"><arg type="s"/></signal>
</interface></node>"""
items = []

def call(conn, sender, path, iface, method, params, inv):
    if method == "RegisterStatusNotifierItem":
        arg = params.unpack()[0]
        items.append(arg if arg.startswith(":") or arg.startswith("org.") else sender + arg)
        conn.emit_signal(None, "/StatusNotifierWatcher", "org.kde.StatusNotifierWatcher",
                         "StatusNotifierItemRegistered", GLib.Variant("(s)", (items[-1],)))
    inv.return_value(None)

def prop(conn, sender, path, iface, name):
    return {"RegisteredStatusNotifierItems": GLib.Variant("as", items),
            "IsStatusNotifierHostRegistered": GLib.Variant("b", True),
            "ProtocolVersion": GLib.Variant("i", 0)}[name]

def acquired(conn, name):
    conn.register_object("/StatusNotifierWatcher", Gio.DBusNodeInfo.new_for_xml(XML).interfaces[0], call, prop, None)

Gio.bus_own_name(Gio.BusType.SESSION, "org.kde.StatusNotifierWatcher", 0, acquired, None, None)
GLib.MainLoop().run()
