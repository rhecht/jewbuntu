#!/usr/bin/env python3
"""Jewbuntu Classic panel layout for GNOME 2.20, derived from Ubuntu 7.10's own default.

Reads Ubuntu's /usr/share/gconf/defaults/05_panel-default-setup.entries and writes a new
entries file (installed as 30_jewbuntu-panel.entries, so update-gconf-defaults applies it after
Ubuntu's). Ubuntu's file is left untouched. Every entry is cloned from one of Ubuntu's, so keys
and schemas stay exactly what gnome-panel 2.20 expects.

Layout, Mac-inspired but laid out for 800x600 and 1024x768 screens:
  top bar   Applications/Places/System menus, window list | tray (ShulGo), keyboard (us/il),
            volume, clock (weekday and time, as on the other editions)
  dock      centred at the bottom: Home, Firefox, Lynx, Terminal, Writer, Text Editor, Help,
            Trash, Show Desktop
Deskbar is left out: it is a Python applet that costs ~15 MB on machines with 256 MB. The user
switcher is left out too (see below).
usage: make-panel.py UBUNTU_ENTRIES OUT_ENTRIES
"""
import copy
import sys
import xml.etree.ElementTree as ET

DOCK_LAUNCHERS = [  # (id, .desktop)
    ('jb_home_launcher', 'nautilus-home.desktop'),
    ('browser_launcher', 'firefox.desktop'),
    ('jb_lynx_launcher', 'jewbuntu-lynx.desktop'),
    ('jb_terminal_launcher', 'gnome-terminal.desktop'),
    ('jb_writer_launcher', 'ooo-writer.desktop'),
    ('jb_gedit_launcher', 'gedit.desktop'),
    ('yelp_launcher', 'file:///usr/share/applications/yelp.desktop'),
]
TOP_RIGHT = [  # right-stuck applets, position 0 = far right
    ('clock', None), ('mixer', None),
    ('jb_keyboard', 'OAFIID:GNOME_KeyboardApplet'), ('notification_area', None),
]


def main():
    src, out = sys.argv[1:3]
    tree = ET.parse(src)
    root = tree.getroot()
    el = root.find('entrylist')
    entries = {e.findtext('key'): e for e in el.findall('entry')}

    def value(key, kind, text):
        e = entries[key]
        v = e.find('value')
        if v is None:
            v = ET.SubElement(e, 'value')
        for c in list(v):
            v.remove(c)
        ET.SubElement(v, kind).text = text

    def string_list(key, items):
        e = entries[key]
        v = e.find('value')
        for c in list(v):
            v.remove(c)
        lst = ET.SubElement(v, 'list', type='string')
        for i in items:
            ET.SubElement(ET.SubElement(lst, 'value'), 'string').text = i

    def clone(kind, template, new):
        """Copy every entry of objects/<template> (or applets/) to a new id."""
        pre, npre = '%s/%s/' % (kind, template), '%s/%s/' % (kind, new)
        for k in [k for k in entries if k.startswith(pre)]:
            e = copy.deepcopy(entries[k])
            e.find('key').text = npre + k[len(pre):]
            el.append(e)
            entries[e.findtext('key')] = e

    def drop(kind, oid):
        pre = '%s/%s/' % (kind, oid)
        for k in [k for k in entries if k.startswith(pre)]:
            el.remove(entries.pop(k))

    # Objects: the menu bar, plus the dock's launchers (cloned from Ubuntu's Firefox launcher).
    for oid in ('email_launcher', 'session_dialog'):
        drop('objects', oid)
    for oid, desktop in DOCK_LAUNCHERS:
        if 'objects/%s/object_type' % oid not in entries:
            clone('objects', 'browser_launcher', oid)
    value('objects/menu_bar/toplevel_id', 'string', 'top_panel')
    value('objects/menu_bar/position', 'int', '0')
    for pos, (oid, desktop) in enumerate(DOCK_LAUNCHERS):
        p = 'objects/%s/' % oid
        value(p + 'toplevel_id', 'string', 'bottom_panel')
        value(p + 'position', 'int', str(pos))
        value(p + 'panel_right_stick', 'bool', 'false')
        value(p + 'launcher_location', 'string', desktop)
    string_list('general/object_id_list', ['menu_bar'] + [o for o, _ in DOCK_LAUNCHERS])

    # Applets.
    # The user switcher shows the full user name, which left the window list almost no room at
    # 800x600; Log Out stays in the System menu.
    for aid in ('deskbar', 'workspace_switcher', 'fast_user_switch'):
        drop('applets', aid)
    clone('applets', 'mixer', 'jb_keyboard')
    for pos, (aid, iid) in enumerate(TOP_RIGHT):
        p = 'applets/%s/' % aid
        value(p + 'toplevel_id', 'string', 'top_panel')
        value(p + 'position', 'int', str(pos))
        value(p + 'panel_right_stick', 'bool', 'true')
        if iid:
            value(p + 'bonobo_iid', 'string', iid)
    value('applets/window_list/toplevel_id', 'string', 'top_panel')
    value('applets/window_list/position', 'int', '1')
    value('applets/window_list/panel_right_stick', 'bool', 'false')
    n = len(DOCK_LAUNCHERS)
    for aid, pos in (('trashapplet', n), ('show_desktop_button', n + 1)):
        p = 'applets/%s/' % aid
        value(p + 'toplevel_id', 'string', 'bottom_panel')
        value(p + 'position', 'int', str(pos))
        value(p + 'panel_right_stick', 'bool', 'false')
    string_list('general/applet_id_list',
                [a for a, _ in TOP_RIGHT] + ['window_list', 'trashapplet', 'show_desktop_button'])

    # The bottom panel becomes a centred dock that is only as wide as its icons. A panel that
    # doesn't fill the edge is placed by x/y keys, and Ubuntu's file names top_panel where it
    # means bottom_panel for y_bottom and x_right, so the dock would sit at the top (y = 0).
    # Add the bottom panel's own keys (cloned from its y entry, so the schema stays right) and
    # put top_panel's y_bottom back to its default.
    for key, schema in (('y_bottom', 'y_bottom'), ('x_right', 'x_right')):
        k = 'toplevels/bottom_panel/' + key
        if k not in entries:
            e = copy.deepcopy(entries['toplevels/bottom_panel/y'])
            e.find('key').text = k
            e.find('schema_key').text = '/schemas/apps/panel/toplevels/' + schema
            el.append(e)
            entries[k] = e
    value('toplevels/bottom_panel/y_bottom', 'int', '0')
    value('toplevels/bottom_panel/x_right', 'int', '-1')
    if 'toplevels/top_panel/y_bottom' in entries:
        value('toplevels/top_panel/y_bottom', 'int', '-1')
    value('toplevels/bottom_panel/expand', 'bool', 'false')
    value('toplevels/bottom_panel/size', 'int', '40')
    value('toplevels/bottom_panel/x_centered', 'bool', 'true')

    tree.write(out, encoding='UTF-8', xml_declaration=False)
    print('panel: %d objects, %d applets' % (1 + n, len(TOP_RIGHT) + 3))


if __name__ == '__main__':
    main()
