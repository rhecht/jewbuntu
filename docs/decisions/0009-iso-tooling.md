# 0009 ISO tooling (milestone 3, not yet decided)

**Constraint.** The ISO must be built from the same packages and repo configuration,
reproducibly, keeping Ubuntu's installer and its disk/encryption flow untouched.

**Candidates to spike.**
1. Ubuntu's own image tooling (livecd-rootfs plus the 26.04 desktop installer
   sources) with an extra package layer. Most faithful, heaviest to set up.
2. Remastering the verified upstream ISO's live layer with a scripted, versioned
   process (squashfs layer adding the Jewbuntu repo and packages). Simpler. Secure Boot
   and installer behaviour must be re-verified.
3. Cubic, for exploratory prototyping only. Its saved session is never the source of truth.

**Deferred.** Until milestone 2 works on a VM via the package route.
