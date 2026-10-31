FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS toolchain
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0 && node --version && pnpm --version
WORKDIR /app

FROM toolchain AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
# Evidence is a private runtime bind mount, not repository content. A build that
# renders route metadata needs it available; the default keeps the historical
# absolute path so an unmodified build behaves exactly as before.
ARG ALRIFAI_EVIDENCE_DIR=/var/lib/vps/al-rifai/evidence
ENV ALRIFAI_EVIDENCE_DIR=$ALRIFAI_EVIDENCE_DIR
COPY . .
RUN node --experimental-strip-types --test tests/message-mirror.mjs
# Evidence files are host runtime data deliberately excluded from the build
# context. Mount them read-only for this RUN only — never COPY/ADD — so route
# metadata collection can verify their checksums without entering image layers.
RUN --mount=type=bind,from=evidence,target=/var/lib/vps/al-rifai/evidence,ro \
    pnpm typecheck && pnpm lint && pnpm build

FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --gid 10001 alrifai && useradd --uid 10001 --gid 10001 --no-create-home alrifai
COPY --from=build --chown=10001:10001 /app/.next/standalone ./
COPY --from=build --chown=10001:10001 /app/node_modules/.pnpm/zod@3.25.76/node_modules/zod /app/node_modules/zod
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=build --chown=10001:10001 /app/public ./public
COPY --from=build --chown=10001:10001 /app/release/private-entry.mjs /app/release/start-private-app.mjs /app/release/entry-rules.mjs ./
COPY --from=build --chown=10001:10001 /app/scripts/message-ingestion.ts /app/scripts/message-ingestion-worker.ts /app/scripts/message-mirror-worker.ts /app/scripts/process-cash.ts /app/scripts/process-vessel.ts /app/scripts/ingestion-db.ts /app/scripts/database.mjs /app/scripts/
COPY --from=build --chown=10001:10001 /app/db/postgres.mjs /app/db/
COPY --from=build --chown=10001:10001 /app/db/migrations/ /app/db/migrations/
COPY --from=build --chown=10001:10001 /app/lib/whatsapp-archive.ts /app/lib/cash-scope.ts /app/lib/cash-publish.ts /app/lib/conversation-scope.ts /app/lib/native-live-reader.ts /app/lib/native-ingest.ts /app/lib/vessel-ops.ts /app/lib/mobile-identity.mjs /app/lib/vessel-match.ts /app/lib/escort-register.mjs /app/lib/duplicate-identity.ts /app/lib/escort-intake-candidate.mjs /app/lib/employee-program-validation.mjs /app/lib/history-extraction.mjs /app/lib/
COPY --from=build --chown=10001:10001 /app/candidates/identity-review/live-cash.ts /app/candidates/identity-review/contracts.ts /app/candidates/identity-review/catalog.ts /app/candidates/identity-review/
USER 10001:10001
EXPOSE 3000
CMD ["node","server.js"]
