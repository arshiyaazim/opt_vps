-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- Owner decisions D4 (monthly allocation) and D5 (shift boundary), 2026-11-04.
-- Do not apply this file to production without a separate, explicit Owner
-- approval, a pre-migration pg_dump and an isolated rehearsal. scripts/
-- database.mjs migrate reads db/migrations/ only, so keeping this file under
-- db/migration-candidates/ means it can never be applied by accident.
--
-- Everything here mirrors logic that already exists in source:
--   * shift enumeration  → lib/shift-boundary.ts  (enumerateDutyShifts)
--   * pay state/gate      → public.recalculate_program_pay()
--   * rate                → public.escort_rate_config (OWNER_RATE_SCHEDULE_2026_11)
-- No new rate, no new money rule, no AI provider.
--
-- WHY A NEW TABLE IS NEEDED AT ALL
-- The Owner rule is: every worked shift and every actual expense is attributed
-- to the month it occurred in (travel may be a later month than release). The
-- schema has no verified travel/return date anywhere:
--   programs.details keys today = version, clientChat, orderId, orderMessageId,
--   confirmationMessageId, confirmationSourceHash, sourceMessageId, matchState,
--   mobileEvidence, motherKey, lighterKey, employeeLink, ownerRule,
--   releaseConfirmed, endShift, releasePoint, programCommand
-- program_pay is DERIVED (recalculate_program_pay upserts/deletes it), so a
-- travel date cannot live there without being erased on the next recalculation.
-- One small event table is therefore the smallest compatible extension.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Verified travel/conveyance events ────────────────────────────────────
-- One row per actual travel event. event_date NULL means "not verified yet" and
-- is never allocated to any month (Owner rule: do not invent a date).
CREATE TABLE IF NOT EXISTS public.vessel_conveyance_event (
  id           text PRIMARY KEY,
  program_id   text NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  event_date   date,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  verified     boolean NOT NULL DEFAULT false,
  source_ref   text,
  evidence     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Identical events cannot be inserted twice; the allocation view also
  -- de-duplicates defensively.
  UNIQUE (program_id, event_date, amount_minor)
);

CREATE INDEX IF NOT EXISTS vessel_conveyance_event_program_idx
  ON public.vessel_conveyance_event (program_id, event_date);

COMMENT ON TABLE public.vessel_conveyance_event IS
  'Verified actual travel events. Monthly conveyance is attributed to the month of event_date; NULL event_date stays unresolved and is recognised in no month.';

-- ── 2. Every worked duty shift, one row per (program, date, shift) ──────────
-- Mirrors enumerateDutyShifts() and public.count_shifts() exactly:
--   shifts = (end-start)*2 + (endShift=N) - (startShift=N) + 1
-- A day is [D, N]; a program starting on N does not claim that day's D, and one
-- ending on D does not claim that day's N.
CREATE OR REPLACE VIEW public.program_duty_shift AS
SELECT p.id                              AS program_id,
       g.day::date                       AS duty_date,
       s.shift                           AS shift,
       to_char(g.day::date, 'YYYY-MM')   AS period
  FROM public.programs p
  CROSS JOIN LATERAL generate_series(
           p."startDate"::date, p."endDate"::date, interval '1 day') AS g(day)
  CROSS JOIN LATERAL (VALUES ('D'), ('N')) AS s(shift)
 WHERE p.status = 'Confirmed'
   AND (p.details::jsonb ->> 'confirmationMessageId') IS NOT NULL
   AND p."startDate" ~ '^\d{4}-\d{2}-\d{2}$'
   AND p."endDate"   ~ '^\d{4}-\d{2}-\d{2}$'
   AND p."endDate"::date >= p."startDate"::date
   AND p.shift IN ('D', 'N')
   AND (p.details::jsonb ->> 'endShift') IN ('D', 'N')
   AND (
        g.day::date > p."startDate"::date
        OR (
             CASE s.shift WHEN 'D' THEN 0 ELSE 1 END
             >= CASE p.shift WHEN 'D' THEN 0 ELSE 1 END
           )
       )
   AND (
        g.day::date < p."endDate"::date
        OR (
             CASE s.shift WHEN 'D' THEN 0 ELSE 1 END
             <= CASE (p.details::jsonb ->> 'endShift') WHEN 'D' THEN 0 ELSE 1 END
           )
       );

COMMENT ON VIEW public.program_duty_shift IS
  'Worked duty shifts, one row per shift, derived from the confirmed program window. Parity source: lib/shift-boundary.ts enumerateDutyShifts().';

-- ── 3. Monthly salary (split by actual duty date) ──────────────────────────
CREATE OR REPLACE VIEW public.payroll_monthly_salary AS
SELECT d.program_id,
       p."escortMobile"                       AS employee_mobile,
       d.period,
       count(*)::bigint                       AS shift_count,
       (count(*) / 2.0)                       AS duty_days,
       count(*)::bigint * pp.shift_rate_minor AS salary_minor
  FROM public.program_duty_shift d
  JOIN public.programs p    ON p.id = d.program_id
  JOIN public.program_pay pp ON pp.program_id = d.program_id AND pp.state = 'CALCULATED'
 GROUP BY d.program_id, p."escortMobile", d.period, pp.shift_rate_minor;

COMMENT ON VIEW public.payroll_monthly_salary IS
  'Salary per employee per month, split by the actual date of each shift. A cross-month program appears in both months; nothing is assigned to the start or release month wholesale.';

-- ── 4. Monthly conveyance (attributed to the travel month) ─────────────────
CREATE OR REPLACE VIEW public.payroll_monthly_conveyance AS
SELECT e.program_id,
       p."escortMobile"            AS employee_mobile,
       to_char(e.event_date, 'YYYY-MM') AS period,
       sum(e.amount_minor)::bigint AS conveyance_minor
  FROM public.vessel_conveyance_event e
  JOIN public.programs p ON p.id = e.program_id
 WHERE e.verified
   AND e.event_date IS NOT NULL
   -- A travel event can never precede the release of the duty it settles.
   AND (btrim(coalesce(p."endDate", '')) = '' OR e.event_date >= p."endDate"::date)
 GROUP BY e.program_id, p."escortMobile", e.event_date;

COMMENT ON VIEW public.payroll_monthly_conveyance IS
  'Verified travel events attributed to the month of travel (may be later than the release month). Unverified or undated events appear in payroll_conveyance_unresolved, never here.';

-- ── 5. Unresolved conveyance (no month until a date is verified) ───────────
CREATE OR REPLACE VIEW public.payroll_conveyance_unresolved AS
SELECT e.program_id,
       p."escortMobile" AS employee_mobile,
       e.id             AS event_id,
       e.amount_minor,
       CASE
         WHEN NOT e.verified THEN 'CONVEYANCE_EVIDENCE_UNVERIFIED'
         WHEN e.event_date IS NULL THEN 'TRAVEL_DATE_UNVERIFIED'
         ELSE 'CONVEYANCE_BEFORE_RELEASE'
       END AS reason
  FROM public.vessel_conveyance_event e
  JOIN public.programs p ON p.id = e.program_id
 WHERE NOT e.verified
    OR e.event_date IS NULL
    OR (btrim(coalesce(p."endDate", '')) <> '' AND e.event_date < p."endDate"::date);

-- ── 6. Combined monthly payroll per employee ───────────────────────────────
CREATE OR REPLACE VIEW public.payroll_monthly AS
WITH salary AS (
  SELECT program_id, employee_mobile, period, shift_count, duty_days, salary_minor
    FROM public.payroll_monthly_salary
), conveyance AS (
  SELECT program_id, employee_mobile, period, conveyance_minor
    FROM public.payroll_monthly_conveyance
), keys AS (
  SELECT employee_mobile, period FROM salary
  UNION
  SELECT employee_mobile, period FROM conveyance
)
SELECT k.employee_mobile,
       k.period,
       coalesce(sum(s.shift_count), 0)::bigint      AS shift_count,
       coalesce(sum(s.duty_days), 0)::numeric       AS duty_days,
       coalesce(sum(s.salary_minor), 0)::bigint     AS base_minor,
       coalesce(sum(c.conveyance_minor), 0)::bigint AS conveyance_minor,
       (coalesce(sum(s.salary_minor), 0)
        + coalesce(sum(c.conveyance_minor), 0))::bigint AS total_minor,
       array_remove(array_agg(DISTINCT s.program_id), NULL) AS program_ids
  FROM keys k
  LEFT JOIN salary s
         ON s.employee_mobile = k.employee_mobile AND s.period = k.period
  LEFT JOIN conveyance c
         ON c.employee_mobile = k.employee_mobile AND c.period = k.period
 GROUP BY k.employee_mobile, k.period;

COMMENT ON VIEW public.payroll_monthly IS
  'Monthly payable per employee = allocated salary + allocated conveyance. Unpaid/paid tracking is deliberately NOT included yet (separate approval required).';

-- ── 7. Reconciliation: monthly must equal program level ────────────────────
CREATE OR REPLACE VIEW public.payroll_reconciliation AS
WITH monthly AS (
  SELECT program_id, sum(shift_count)::bigint AS shift_count, sum(salary_minor)::bigint AS salary_minor
    FROM public.payroll_monthly_salary
   GROUP BY program_id
), conveyed AS (
  SELECT program_id,
         sum(conveyance_minor)::bigint AS conveyance_minor,
         min(period) AS first_period,
         max(period) AS last_period
    FROM public.payroll_monthly_conveyance
   GROUP BY program_id
), unresolved AS (
  SELECT program_id, sum(amount_minor)::bigint AS unresolved_minor
    FROM public.payroll_conveyance_unresolved
   GROUP BY program_id
)
SELECT p.id AS program_id,
       pp.shift_count        AS program_shift_count,
       m.shift_count         AS monthly_shift_count,
       pp.salary_minor       AS program_salary_minor,
       coalesce(m.salary_minor, 0)      AS monthly_salary_minor,
       pp.conveyance_minor   AS program_conveyance_minor,
       coalesce(c.conveyance_minor, 0)  AS allocated_conveyance_minor,
       coalesce(u.unresolved_minor, 0)  AS unresolved_conveyance_minor,
       (pp.salary_minor = coalesce(m.salary_minor, 0)
        AND pp.conveyance_minor = coalesce(c.conveyance_minor, 0) + coalesce(u.unresolved_minor, 0)
        AND pp.shift_count = coalesce(m.shift_count, 0)) AS reconciles,
       c.first_period, c.last_period
  FROM public.programs p
  JOIN public.program_pay pp ON pp.program_id = p.id AND pp.state = 'CALCULATED'
  LEFT JOIN monthly m    ON m.program_id = p.id
  LEFT JOIN conveyed c   ON c.program_id = p.id
  LEFT JOIN unresolved u ON u.program_id = p.id;

COMMENT ON VIEW public.payroll_reconciliation IS
  'Proof that monthly allocations add up to the program-level derived pay. A program that does not reconcile must never be presented as payable.';

-- ── 8. Grants (read-only projections) ──────────────────────────────────────
GRANT SELECT ON public.program_duty_shift          TO alrifai_app, ir_review_runtime;
GRANT SELECT ON public.payroll_monthly_salary      TO alrifai_app, ir_review_runtime;
GRANT SELECT ON public.payroll_monthly_conveyance  TO alrifai_app, ir_review_runtime;
GRANT SELECT ON public.payroll_conveyance_unresolved TO alrifai_app, ir_review_runtime;
GRANT SELECT ON public.payroll_monthly             TO alrifai_app, ir_review_runtime;
GRANT SELECT ON public.payroll_reconciliation      TO alrifai_app, ir_review_runtime;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- REHEARSAL CHECKLIST BEFORE THIS MAY BE PROPOSED FOR APPROVAL
--   1. Apply on an isolated PostgreSQL 16 copy, never on production.
--   2. Parity: for every confirmed program,
--        SELECT count(*) FROM program_duty_shift WHERE program_id = X
--      must equal program_pay.shift_count (818 shifts today across 37 programs).
--   3. Parity: program-level totals already reconcile by construction
--      (program_pay) — payroll_reconciliation must return reconciles = true for
--      all 37 CALCULATED programs with unresolved_conveyance_minor = 0.
--   4. The BDT 500 in the Owner's January/February example is illustrative only:
--      no rate row may be added for it.
--   5. Rollback: DROP VIEW payroll_monthly, payroll_reconciliation,
--      payroll_monthly_salary, payroll_monthly_conveyance,
--      payroll_conveyance_unresolved, program_duty_shift; DROP TABLE
--      vessel_conveyance_event. No existing table is altered, so no data is lost.
-- ════════════════════════════════════════════════════════════════════════════
