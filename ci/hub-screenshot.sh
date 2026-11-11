#!/bin/bash
# Inside an Ubuntu 26.04 container: run the Hub under Xvfb with and without the service, and screenshot pages.
set -u
export HOME=/tmp/u XDG_CONFIG_HOME=/tmp/u/.config GSK_RENDERER=cairo GTK_A11Y=none LANG=C.UTF-8 TZ=America/Toronto
mkdir -p $XDG_CONFIG_HOME/jewbuntu /out
echo '{"schema_version":2,"location":{"name":"Toronto","latitude":43.65333,"longitude":-79.38389,"timezone":"America/Toronto"},"calendar":{"candle_lighting_minutes":18}}' > $XDG_CONFIG_HOME/jewbuntu/settings.json
Xvfb :99 -screen 0 900x1000x24 >/dev/null 2>&1 & sleep 1
export DISPLAY=:99 GDK_BACKEND=x11
shot() { # $1 page, $2 file, $3 with service?
  JEWBUNTU_HUB_PAGE=$1 gjs -m /c/hub/src/main.js > /out/$2.log 2>&1 & APP=$!
  sleep 4; import -window root /out/$2.png; kill $APP 2>/dev/null; wait $APP 2>/dev/null
  grep -i -E "error|critical|warning" /out/$2.log | head -5
}
shot today hub-today-no-service
gjs -m /c/jewish-service/src/service.js >/out/service.log 2>&1 & SVC=$!; sleep 1.5
shot today hub-today
shot settings hub-settings
shot calendar hub-calendar
shot minyanim hub-minyanim
kill $SVC
ls -la /out/*.png
