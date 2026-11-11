# 0003 Runtimes: Python for tooling, GJS for the service, Hub and extension

**Decision.** Core settings, the doctor and the upgrade tools use Python 3 with the
standard library only. The Jewish service, Hub and GNOME extension (milestone 2)
will use GJS, sharing one bundled ES-module build of `@hebcal/core` (exact version
pinned in a lockfile and checked for licence). Unit tests run that bundle under
Node; smoke tests run it under GJS in the Ubuntu container.

**Why.** Both runtimes ship with every Ubuntu desktop, so old PCs carry no extra
runtime and nothing needs pip or npm at install time. One runtime for the service,
Hub and extension avoids duplicating calendar logic.

**Risk to verify in M2 (spike).** That the esbuild bundle runs under GJS 1.88 with
`Intl` timezone support, and that results match Hebcal's own reference outputs.
If it fails, fall back to a Node service (`nodejs` 22 is in the archive) and keep
the D-Bus contract unchanged.

**Settings format shared with GJS.** The GJS service reads the same
`settings.json`. Only Python performs schema migrations. The service refuses to
write a schema newer than it knows.

## Spike result (2026-11-11): passed

`@hebcal/core` 6.16.0 bundled with esbuild into one ES module (544 KB) runs under
GJS 1.88 in the Ubuntu 26.04 container: imports, `Intl` timezone formatting, Hebrew
rendering with nikud, zmanim, candle lighting, parsha. Cold start including GJS is
about 110 ms. `computeDay()` output is byte-identical between GJS and Node 22 for
the cross-runtime cases. Licences are compatible with the proposed GPL-3.0-or-later.
Decision confirmed: GJS service + Hub + extension share `src/day.js`.
