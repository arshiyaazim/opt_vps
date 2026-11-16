# AL-RIFA'I — Standalone Package

A lean, organization-independent business management application, prepared in
this workspace. The installable application is `apps/al-rifai/`; this folder is
the distribution package (no Git history, no production paths).

```
al-rifai-standalone/
├── README.md                  this file
├── COPY-MANIFEST.txt          provenance of the original source copy
├── apps/al-rifai/             the application
│   ├── README.md              installation, configuration, WhatsApp, operations
│   ├── app/                   pages + APIs (new standalone runtime)
│   ├── lib/standalone/        domain services (employees, programs, attendance,
│   │                          finance, payroll, review, audit, whatsapp)
│   ├── db/standalone/         fresh baseline schema (one file, no 75 migrations)
│   ├── scripts/standalone/    installer + preflight + verification
│   ├── tests/standalone/      domain + WhatsApp-adapter tests
│   ├── legacy-runtime/        preserved original UI/API (not built, reference)
│   └── docs/                  mapping, removed files, verification record
└── reference/canonical-docs/  documentation snapshot of the original system
```

## Quick start

```bash
sudo cp -a apps/al-rifai /opt/alrifai/app && cd /opt/alrifai/app
pnpm install --frozen-lockfile && pnpm build

# PostgreSQL 16: create database + owner role + runtime role (README §3.3)
cp .env.example .env && chmod 600 .env   # edit host/db/users/secret paths
pnpm db:preflight
pnpm db:install --admin-user owner --admin-password '…'
pnpm start
```

Full instructions (dedicated database and shared-schema mode, WhatsApp relay,
HTTPS, backup, updates, troubleshooting, limitations): `apps/al-rifai/README.md`.

## What is verified

* fresh schema install (26 tables, 5 functions, 14 triggers) in a dedicated
  database **and** in an isolated schema of a shared database;
* 10/10 domain + adapter tests on a disposable PostgreSQL 16.15;
* 35/35 pure unit tests;
* `tsc --noEmit` clean and `next build --webpack` succeeds (exit 0).

## What is not verified

* live WhatsApp: the relay adapter is tested only against a protocol mock;
* authenticated browser click-through (no headless browser run here);
* conveyance allocation, advances and food-bill payroll rules (not defined in
  the source material — deliberately not invented).

See `apps/al-rifai/docs/STANDALONE-VERIFICATION.md` for the full record.
