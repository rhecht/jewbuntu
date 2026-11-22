#!/bin/sh
# Jewbuntu Classic: last word on the installed system's apt sources.
#
# Run by the installer once it has finished (ubiquity/success_command in preseed/ubuntu.seed),
# as root, while the new system is still mounted on /target.
#
# The preseed already points the installer at old-releases.ubuntu.com, where Ubuntu 7.10 now
# lives. This is the safety net in case any country mirror (gb.archive.ubuntu.com and the like)
# or security.ubuntu.com still ends up in the file: none of those carry 7.10 any more, so the
# installer comments their lines out ("failed to verify") and the new system has no working
# sources. Here every such line is pointed at old-releases and switched back on.
#
# The cdrom line and the ordinary comments are left alone. Running it twice changes nothing.

LIST="${1:-/target}/etc/apt/sources.list"
[ -f "$LIST" ] || exit 0

[ -e "$LIST.installer" ] || cp -p "$LIST" "$LIST.installer"
sed -i \
	-e '/^# Line commented out by installer because it failed to verify:$/d' \
	-e 's|^#\(deb\(-src\)\{0,1\} http://\([a-z][a-z]\.\)\{0,1\}archive\.ubuntu\.com/\)|\1|' \
	-e 's|^#\(deb\(-src\)\{0,1\} http://security\.ubuntu\.com/\)|\1|' \
	-e 's|http://\([a-z][a-z]\.\)\{0,1\}archive\.ubuntu\.com/ubuntu/\{0,1\} |http://old-releases.ubuntu.com/ubuntu |' \
	-e 's|http://security\.ubuntu\.com/ubuntu/\{0,1\} |http://old-releases.ubuntu.com/ubuntu |' \
	"$LIST"
logger -t jewbuntu "apt sources pointed at old-releases.ubuntu.com ($LIST; the installer copy is $LIST.installer)" 2>/dev/null || true
exit 0
