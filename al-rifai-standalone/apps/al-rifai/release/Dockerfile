FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
USER root
RUN groupadd --gid 10001 alrifai && useradd --uid 10001 --gid 10001 --no-create-home alrifai && apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && python3 -m venv /opt/alrifai-python && /opt/alrifai-python/bin/pip install --no-cache-dir openpyxl==3.1.5 et-xmlfile==2.0.0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=10001:10001 .next/standalone/ ./
COPY --chown=10001:10001 .next/static/ ./.next/static/
COPY --chown=10001:10001 public/ ./public/
COPY --chown=10001:10001 release/private-entry.mjs release/start-private-app.mjs /app/
COPY --chown=10001:10001 scripts/reconcile-ingest.mjs scripts/parse-import.py /app/scripts/
COPY --chown=10001:10001 lib/reconciliation-core.mjs lib/history-extraction.mjs lib/escort-intake-candidate.mjs lib/employee-program-validation.mjs lib/escort-register.mjs /app/lib/
COPY --chown=10001:10001 docs/evidence-checksums.json /app/docs/evidence-checksums.json
COPY --chown=10001:10001 data/conversation-policy.json /app/data/conversation-policy.json
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 ALRIFAI_OWNER_RECONCILIATION=1 HOSTNAME=0.0.0.0 PORT=3000
USER 10001:10001
CMD ["node","/app/start-private-app.mjs"]
