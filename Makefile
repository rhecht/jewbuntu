# Jewbuntu build entry points. dh_auto_build runs `make`, dh_auto_test runs `make test`.
PYTHON ?= python3
SOUND := build/jewbuntu-startup.wav

.PHONY: all build sounds test clean deb container-test

all: build

build: sounds

sounds: $(SOUND)

$(SOUND): assets/sounds/hava-nagila-8bit.json assets/sounds/synth.py
	mkdir -p build
	$(PYTHON) -B assets/sounds/synth.py assets/sounds/hava-nagila-8bit.json $@

test: build
	$(PYTHON) -B -m unittest discover -s tests/unit -t . -v

clean:
	rm -rf build

# Build .deb files (run on Ubuntu, or use ci/container-build.sh from macOS).
deb:
	dpkg-buildpackage -us -uc -b

container-test:
	ci/container-test.sh
