# 0001 Base: Ubuntu 26.04.1 LTS "resolute", amd64 target

**Decision.** Build on Ubuntu 26.04.1 LTS (codename `resolute`), GNOME Shell 50.1,
GJS 1.88, Python 3.14 (versions observed in the `ubuntu:26.04` container image,
digest `sha256:6a06111c...4f3c`, on 11 Nov 2026). amd64 is the image target.
Packages are `Architecture: all`, so they also install on arm64 for development checks.

**Not decided here.** The exact desktop ISO filename and checksum is recorded when
the ISO is downloaded and verified (see `docs/test-results/`).

**Old hardware.** 26.04 desktop guidance is 6 GB RAM. Both test machines exceed it.
Sandy Bridge CPUs are x86-64-v2, so they must use standard amd64 packages, never
the amd64v3 variant. The doctor reports this.

**Future releases.** Nothing hard-codes a future release. The next LTS is added to
`support-matrix.json` only after its own builds and tests exist.

**24.04.** Assessed for hardware guidance only and listed as a candidate with status
`not-built`. Choosing it would require separate builds, GNOME 46 extension testing
and a real 24.04→26.04 upgrade test.
