# Hardware support

Nothing below is certified. Every row needs a recorded `jewbuntu doctor --json` and the checklist in `docs/vm-setup.md`.

| Machine | Known facts | Expectations to verify | Status |
| --- | --- | --- | --- |
| HP, about 2012, 2nd-gen Core i5, 16 GB | RAM exceeds both 24.04 (4 GB) and 26.04 (6 GB) desktop guidance | Exact CPU SKU and clock (2 GHz guideline), model ID, disk type/health, free space, GPU acceleration, audio, network, suspend, thermals. A Sandy Bridge CPU would be x86-64-v2 (AVX, no AVX2): standard amd64 only, no AVX2-only AI binaries. | Not tested |
| MacBook Pro 2017 (Intel), 8 GB | RAM exceeds guidance; Kaby Lake-class CPUs are x86-64-v3 | Apple model identifier (MacBookPro14,x) and Touch Bar variant, keyboard/trackpad (SPI on some models), Wi-Fi chipset, audio (often problematic on 2016-2017 models), suspend/resume, battery, thermals, display scaling | Not tested |
| iMac M1, 16 GB | Apple Silicon | Not a Jewbuntu target. Stays on macOS. Optional remote AI endpoint later. Hosts the arm64 development VM. | n/a |

Profiles by measured RAM (doctor): at least 8 GB → desktop; 6-8 GB → desktop (constrained, no local AI); under 6 GB → node (Lite is a later investigation).
