# 0008 Startup sound at graphical login, once per boot

**Decision.** Play the jingle from an XDG autostart entry (graphical login only),
not from Plymouth or early boot. A per-user marker containing the kernel `boot_id`
prevents replays across re-logins in the same boot. Lock/unlock and resume never
start autostart entries.

**Rules.** The setting must be on. It is skipped in the quiet schedule and skipped
(for the whole boot) if output is muted. It waits at most 6 s for an audio sink
(asynchronous, so login is never delayed), plays at a stream-relative volume
(default 0.6), and never changes system volume. The node profile has no graphical
session and stays silent.

**Why not boot splash.** Audio in early boot needs drivers and a sound server that
aren't reliably up, and would need privileged hacks the brief rules out.

**Interim limitation.** The quiet schedule uses a broad weekly fallback window
(Friday 12:00 to Saturday 23:59 local) until the calendar service supplies real
candle-lighting and havdalah times in milestone 2.
