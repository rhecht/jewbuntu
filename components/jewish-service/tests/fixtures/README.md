# Calendar reference fixtures

Fetched on 2026-11-11 from Hebcal's public JSON API (hebcal.com), an independent
server-side implementation, using public GeoNames city IDs (no personal data):
Toronto 6167865, Jerusalem 281184, Tromsø 3133895. Hebcal API content is CC BY 4.0
(attribution: Hebcal.com). Times on hebcal.com are rounded to the minute, so tests
allow ±1 minute for zmanim and require exact equality for candle-lighting times.

Re-fetch only deliberately (results must not drift silently), and record the date.
