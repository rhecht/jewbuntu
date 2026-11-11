# 0002 Packaging: one native source package, several binary packages

**Decision.** A single native Debian source (`jewbuntu`, debhelper 13,
`Rules-Requires-Root: no`) produces the binary packages. Version format:
`<upstream>+<ubuntu-version>`, for example `0.1.0~m1.2+26.04`. Each Ubuntu suite gets
its own build from the same source, and a later release's build sorts higher.

Python code is a *private* module directory (`/usr/lib/jewbuntu/python/jewbuntu`)
with launchers that disable bytecode writes, so no untracked `__pycache__` files
appear under `/usr`. The container test verifies nothing is left after purge.

**Rejected.** dh-python/pybuild (unneeded for a private stdlib-only module); a
custom installer script (would bypass dpkg ownership); Conflicts against Ubuntu
metapackages (would break release upgrades).

**Upgrades.** Plain packages with explicit Depends travel through
`do-release-upgrade`. After an upgrade, `jewbuntu repo enroll` points APT at the
build for the new codename, but only if the support matrix lists it.
