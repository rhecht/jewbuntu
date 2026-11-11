# 0006 Desktop look: vendor GSettings override over stock Ubuntu components

**Decision.** The Mac-inspired look comes only from GSettings vendor defaults
(`90_jewbuntu-desktop.gschema.override`, `:ubuntu` desktop-specific sections that
sort after Ubuntu's `10_ubuntu-settings`), Ubuntu's own dock (dash-to-dock schema
from `gnome-shell-ubuntu-extensions`), Yaru, and GNOME's accent colour. No third-party
theme, no extension chain, no patched GTK/libadwaita.

**Effects.** Users' own choices always win. `jewbuntu defaults restore` resets only
the keys in `desktop-defaults.json`. Removing `jewbuntu-desktop` returns Ubuntu's
defaults. The stock "GNOME" session ignores `:ubuntu` overrides and remains a plain fallback.

**Evidence.** In a container with `ubuntu-desktop-minimal` and GNOME Shell 50.1, all
15 managed keys resolve to Jewbuntu values for a fresh user, with no schema compile
warnings. Not yet seen rendered in a graphical session.

**Open.** gnome-settings-daemon may import keyboard layouts from the installer
(localed) into the user's settings on first login, which would override the Hebrew
input-source default. Verify in the VM. If so, onboarding (M2) adds Hebrew explicitly,
with consent.
