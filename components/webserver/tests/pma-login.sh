#!/bin/bash
# Log in to phpMyAdmin at http://127.0.0.1/phpmyadmin/ with USER PASSWORD; exit 0 if it worked.
set -u
c=$(mktemp)
tok=$(curl -s -c "$c" http://127.0.0.1/phpmyadmin/ | grep -o 'name="token" value="[^"]*"' | head -1 | sed 's/.*value="//; s/"$//')
[ -n "$tok" ] || { echo "no login form"; exit 1; }
page=$(curl -s -b "$c" -c "$c" -L --data-urlencode "pma_username=$1" --data-urlencode "pma_password=$2" \
  --data-urlencode server=1 --data-urlencode "token=$tok" "http://127.0.0.1/phpmyadmin/index.php?route=/")
grep -q -i -E "logout|log out" <<<"$page" || { echo "login failed"; grep -o -i "error[^<]*" <<<"$page" | head -3; exit 1; }
