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
