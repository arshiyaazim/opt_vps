-- Proposal only: apply with reviewed activation and actual migration ledger.
-- Existing runtime role remains nonowner; no financial/business mutations.
GRANT SELECT (id,date,source,"employeePhone",name,method,"amountCents") ON public.site_cash_archive TO ir_review_runtime;
GRANT SELECT (id,actor,"createdAt") ON public.site_payment_drafts TO ir_review_runtime;
GRANT SELECT (id,actor,"createdAt") ON public.site_settlement_drafts TO ir_review_runtime;
GRANT SELECT (id,"datasetId",kind,"contentHash") ON public.site_source_snapshots TO ir_review_runtime;
-- Exact STAFF workspace.read grants and SUPER_ADMIN are additionally required.
-- Payload/details/raw evidence are deliberately excluded from these grants.
