# APT repository layout (planned; no public hosting yet)

```text
<base-url>/
  dists/<codename>/            stable channel      (e.g. resolute)
  dists/<codename>-testing/    testing channel     (e.g. resolute-testing)
    InRelease, Release(.gpg)   Origin: Jewbuntu, Label: Jewbuntu
    main/binary-all/Packages
  pool/main/j/jewbuntu/*.deb
```

- Clients trust it only through `Signed-By: /usr/share/keyrings/jewbuntu-archive-keyring.gpg`.
- `jewbuntu repo enroll` writes the source for the running codename and an APT pin that limits this origin to `jewbuntu-*`.
- Signing keys are never stored in this repository or in images. A future `jewbuntu-archive-keyring` package will ship only the public key.
- `ci/container-test-inner.sh` contains a working example of generating and signing such a repo with an *ephemeral* key (`apt-ftparchive` + `gpg --clearsign`).
- Promotion: build → testing suite → container + VM checks → copy identical .debs to stable. Never rebuild on promotion.
