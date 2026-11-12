# jewbuntu-shulgo build recipe

ShulGo's widget code is private (github.com/rhecht/shulgo) and is **not** stored in this
repository. This folder holds only the Debian packaging recipe. Build the package from a
checkout of the ShulGo repository (access required):

    ci/build-shulgo-deb.sh /path/to/shulgo <commit> dist/shulgo

The script exports `integrations/shulgo-core` and `integrations/jewbuntu` at that commit into a
temporary tree, adds this recipe, and builds `jewbuntu-shulgo_<version>_all.deb` in an Ubuntu
26.04 container. The settings schema is installed system-wide only; no API key is included.
`jewbuntu-desktop` and `jewbuntu-hub` only *recommend* this package, so Jewbuntu builds and
installs without it.
