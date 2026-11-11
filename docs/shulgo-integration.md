# Shulgo integration (milestone 2)

## Known

- The product name is **Shulgo**. It is a directory of shuls and minyanim with Orthodox-focused scope defined by its backend.
- A local Shulgo project exists on the developer machine (`/Applications/MAMP/htdocs/shulgo`). It has **not** been inspected yet.

## Unknown, so nothing is assumed

API base URL, endpoints, authentication, rate limits, JSON contract, schedule
semantics, verification/"recently confirmed" flags, minyan-forming status, deep-link
paths for listings, licensing of the data for offline caching.

## Plan

1. Read the Shulgo code/docs (with permission) and write the contract here, citing files.
2. Adapter in the service with contract fixtures recorded from the real API, plus a clearly labelled **demo mode** using invented sample data that is never shown as real.
3. States: loading, no results, offline (cached with visible age), unavailable, and error. Listing vs recently confirmed vs forming are always distinguished. Countdown uses absolute timestamps in the shul's timezone.
4. Directions only through a map service the user picks; distance is labelled straight-line.

## Shulgo's own Linux widget (in progress elsewhere)

Rafi is having the Shulgo project build a Linux widget for minyanim. When a build
exists, Jewbuntu will:

1. Install and test it in the VM first (record version, source, checksum and licence).
2. Prefer a packaged form (`.deb` or a signed APT source) so it upgrades with the system.
   If it is a GNOME extension, it must declare only tested GNOME versions, like `jewbuntu-gnome`.
3. Integrate it via Recommends from `jewbuntu-desktop` (never a hard dependency), and link
   it from the Hub's Nearby Minyanim view, rather than duplicating its features.
4. Read the widget's actual API usage to write the contract above. Nothing is assumed in the meantime.
