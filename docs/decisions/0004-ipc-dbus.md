# 0004 IPC: versioned D-Bus interface on the session bus (milestone 2)

**Decision.** The service owns `org.jewbuntu.Jewish1` on the session bus and is
D-Bus activated as a systemd user service. The interface exposes an
`InterfaceVersion` property. Clients (Hub, extension) use asynchronous calls with
timeouts, and show "service unavailable" instead of blocking.

**Why.** It is standard on GNOME, works without root, and restarts independently of
the shell. A major contract change gets a new name (`...Jewish2`), so an old
extension fails visibly instead of misbehaving.
