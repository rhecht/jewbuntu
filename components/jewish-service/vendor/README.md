# vendor/hebcal.bundle.js

Single ES module containing `@hebcal/core` 6.16.0 (GPL-2.0-or-later) and its
dependencies `@hebcal/hdate` 0.23.1 (GPL-2.0-or-later), `@hebcal/noaa` 0.12.4
(LGPL-2.1), `temporal-polyfill` (MIT) and `quick-lru` (MIT). Licence texts are kept
at the end of the bundle (`--legal-comments=eof`).

Built from the pinned `package-lock.json` with:

    cd components/jewish-service && npm ci && npm run bundle

It is committed so package builds are offline and reproducible; CI should rebuild it
and fail if the output differs. It runs unchanged under GJS 1.88 (Ubuntu 26.04) and
Node 22 (tests); `tests/cross-runtime.js` checks they agree.
de7a3fdc6e7926913871a24fce664a45d3b2f033925bef559652aea821c5a95d  components/jewish-service/vendor/hebcal.bundle.js
