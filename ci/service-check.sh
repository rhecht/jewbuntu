#!/bin/bash
# Runs inside an Ubuntu 26.04 container: exercises the GJS D-Bus service on a private session bus.
set -eu
export HOME=/tmp/u XDG_CONFIG_HOME=/tmp/u/.config; mkdir -p $XDG_CONFIG_HOME/jewbuntu
echo '{"schema_version":2,"location":{"name":"Toronto","latitude":43.65333,"longitude":-79.38389,"timezone":"America/Toronto"}}' > $XDG_CONFIG_HOME/jewbuntu/settings.json
gjs -m /js/src/service.js > /tmp/service.log 2>&1 &
SVC=$!
for i in $(seq 1 30); do gdbus introspect --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 >/dev/null 2>&1 && break; sleep 0.2; done
echo "InterfaceVersion: $(gdbus call --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 --method org.freedesktop.DBus.Properties.Get org.jewbuntu.Jewish1 InterfaceVersion)"
gdbus call --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 --method org.jewbuntu.Jewish1.GetDay | python3 -c "
import sys,json,ast; s=ast.literal_eval(sys.stdin.read().strip())[0]; d=json.loads(s)
print('GetDay:', d['hebrewDate']['en'], '|', d['hebrewDate']['he'], '| parsha', (d['parsha'] or {}).get('en'), '| zmanim', len(d['zmanim']), '| loc', d['location']['name'])"
gdbus call --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 --method org.jewbuntu.Jewish1.GetDayAt 1800000000000 | python3 -c "
import sys,json,ast; d=json.loads(ast.literal_eval(sys.stdin.read().strip())[0]); print('GetDayAt(2027-01-15):', d['civilDate'], d['hebrewDate']['en'])"
timeout 4 gdbus monitor --session --dest org.jewbuntu.Jewish1 > /tmp/monitor.log 2>&1 &
sleep 0.5
python3 - <<'PY'
import json,os; p=os.environ['XDG_CONFIG_HOME']+'/jewbuntu/settings.json'; d=json.load(open(p)); d['location']={"name":"Jerusalem","latitude":31.76904,"longitude":35.21633,"timezone":"Asia/Jerusalem"}; d['calendar']={"region":"israel"}
tmp=p+'.tmp'; json.dump(d,open(tmp,'w')); os.replace(tmp,p)
PY
sleep 3
grep -q "DayChanged" /tmp/monitor.log && echo "PASS: DayChanged emitted after settings change" || { cat /tmp/monitor.log; echo "FAIL: no DayChanged"; }
grep -o 'Jerusalem' /tmp/monitor.log | head -1 | sed 's/^/signal payload mentions: /'
echo "RSS of service: $(ps -o rss= -p $SVC) KB"
rm $XDG_CONFIG_HOME/jewbuntu/settings.json; sleep 1.5
gdbus call --session --dest org.jewbuntu.Jewish1 --object-path /org/jewbuntu/Jewish1 --method org.jewbuntu.Jewish1.GetDay | python3 -c "
import sys,json,ast; d=json.loads(ast.literal_eval(sys.stdin.read().strip())[0]); print('without settings file:', d['hebrewDate']['en'], '| warnings:', d['warnings'])"
echo "--- service log:"; cat /tmp/service.log
kill $SVC
