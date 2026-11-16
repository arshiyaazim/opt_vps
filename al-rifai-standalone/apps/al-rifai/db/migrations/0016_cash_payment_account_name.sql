-- Allow the owner-selected production cash account label exactly as approved.
-- Existing account labels remain constrained by the original safe pattern.
-- Replace the original account-name check with the approved Cash Payment
-- label while retaining the existing safe-label validation.
ALTER TABLE public.cash_instructions DROP CONSTRAINT cash_instructions_cash_account_check;
ALTER TABLE public.cash_instructions ADD CONSTRAINT cash_instructions_cash_account_check
 CHECK (cash_account IS NULL OR cash_account='Cash Payment' OR cash_account ~ '^[A-Za-z0-9_.:-]{1,100}$');
