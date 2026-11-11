# Support policy

- Jewbuntu supports only Ubuntu **LTS** releases listed in [`support-matrix.json`](../support-matrix.json).
- A release/architecture/GNOME combination is marked `pass` only with recorded evidence in `docs/test-results/`.
- Status values: `in-development` → `testing` → `supported` → `maintenance` (previous LTS while the next is certified) → `end-of-life`.
- The previous supported LTS stays maintained while the next one is being certified.
- A future Ubuntu release is never listed before it exists and has its own builds and tests.
- Each release gets separate binary builds (`+<ubuntu-version>` suffix), even from identical source.
- GNOME extension compatibility is declared only for GNOME majors actually tested. The Hub must work without the extension.
- Security updates from Ubuntu are never held back for Jewbuntu's sake.

## Qualifying the next LTS (procedure)

1. When the new LTS's container image and ISO are published, add a CI build target for it (copy `ci/Dockerfile.build` with the new tag).
2. Build `+<new-version>` packages and run `ci/container-test.sh` plus the desktop test on it.
3. Port and test `jewbuntu-gnome` against the new GNOME major. Until then it is not offered for that release.
4. In a VM: install the previous LTS with Jewbuntu, export settings, run Ubuntu's supported upgrader, confirm the Jewbuntu repo was disabled, run `jewbuntu upgrade-check` and `jewbuntu repo enroll`, and verify settings and features.
5. Only then add the release to `support-matrix.json` with status `testing`, and record the results.
