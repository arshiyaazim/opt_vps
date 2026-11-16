#!/usr/bin/env bash
# Daily TLS expiry check for app.al-rifai.iamazim.com.
#
# The certificate was issued via ACME DNS-01 with an operator procedure
# (see /etc/vps/apps/al-rifai/tls/acme/issued.json). There is no certbot
# binary, the DNS credential is not configured and the app serves TLS itself
# (443 -> 3443), so automatic renewal is NOT possible yet. This timer detects
# expiry early and logs a clear, actionable alert instead of pretending to
# renew. Exit code 2 = operator action required.
set -Eeuo pipefail

CERT="/etc/vps/apps/al-rifai/tls/private-entry.crt"
LOG="/var/log/alrifai-tls-check.log"
WARN_DAYS="${WARN_DAYS:-30}"

exec >>"$LOG" 2>&1
if [ ! -r "$CERT" ]; then
  echo "$(date -Is) TLS_ALERT certificate missing at $CERT"
  exit 2
fi

end_human="$(openssl x509 -in "$CERT" -noout -enddate | cut -d= -f2)"
end_epoch="$(date -d "$end_human" +%s)"
now_epoch="$(date +%s)"
days=$(( (end_epoch - now_epoch) / 86400 ))

echo "$(date -Is) tls_check days_left=$days notAfter=$end_human"

if [ "$days" -lt "$WARN_DAYS" ]; then
  echo "$(date -Is) TLS_ALERT certificate expires in ${days}d — manual DNS-01 renewal required (no certbot/DNS credential configured)."
  exit 2
fi
