# Production release — 2026-11-04 (integrated Vessel / Release Audit / Forwarding)

Status: deployed and verified. Owner-authorized.

## Artifacts
- Source: `release-20261104-vessel-audit` @ `8096ed8` (merge `41c5073`: deployed
  Cash parser `38ce0da` + Vessel parser/guard/backfill + atomic Release audit +
  forwarded-message processing + manual-apply audit hardening).
- Image: `sha256:924b05259d761759941cbd0fa2f668799123d35e7e9096e4a1c0d1bd24507b33`
  (built from `41c5073`; `8096ed8` adds only the compose pin).
- Migration: `0071_release_apply_atomic.sql`,
  sha256 `4a43dec4361752cb0dc327a3148bf583d03883f5e8552aa945af23f0a6237245`,
  ledger 74 → 75.
- Backup: `/var/lib/vps/al-rifai/backups/pre-final-deploy-20261104-0645.dump`,
  sha256 `2922671ab2a77dfc61a3abe9f40a4ded7f779458c80b14efefd7ee9fa5a98dbf`,
  780 TOC entries, 83 table-data sections, mode 600.

## Deployed state
- App image `sha256:924b0525…`, healthy, `RestartCount=0`.
- `roster_mode=DB`; 11/11 WhatsApp cursors, 0 errors.
- Programs 96 (91 Confirmed), Register 1,024, Admin Confirmations 133.
- HADIZ Escort Change preserved in both directions (13.07 `replacedBy` ↔ 15.07
  `replacementOf`/`ESCORT_CHANGE`).
- Canonical duplicate groups 0; duplicate Programs by business identity 0.
- Cash: 0 current postings (1,586 archive-epoch only), 3 portal users unchanged,
  Cash runtime files byte-identical to the previous image.
- `release_auto_apply_log` 0 rows; 0 eligible candidates at deploy time.
- Release apply is atomic-only; auto and manual paths fail closed without 0071.

## Rollback
- App: re-pin `sha256:103f59f27321a93cb59fb72a1b3dce20ac176da5dd5bb046a68366f8c00a24a5`
  and `docker compose ... up -d --no-deps app` (0071 may stay applied; audit
  privileges remain).
- Migration: drop `apply_release_candidate`, drop
  `release_auto_apply_log_candidate_uk`, revoke the sequence, delete the ledger
  row. Keep any audit rows already written.
- Data: restore the backup above.

## Notes
- Candidate 2093 remains without an audit row; not reconstructed.
- Candidate 2235 remains stale MATCHED; untouched.
- Local `main` worktree in `/opt/vps` still carries uncommitted Cash UI work and
  remains at the pre-merge source commit; remote `main` is at the deployed commit.
