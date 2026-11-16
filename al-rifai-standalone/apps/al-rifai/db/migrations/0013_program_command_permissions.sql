-- PREPARED ONLY, NOT APPLIED. Proposed next migration after live ledger 0012.
-- Exact additional production approval required; caller records checksum/receipt.
-- Retain existing SELECT, identity authorization, revision/CAS and history trigger.
-- No DELETE/TRUNCATE, financial grant, registry write, new role or trigger bypass.
GRANT INSERT (
 id,"motherVessel","lighterVessel","masterMobile",destination,
 "escortName","escortMobile","startDate","endDate",shift,status,details,revision,
 source,notes,"duplicateOf","createdAt"
) ON public.programs TO ir_review_runtime;
GRANT UPDATE (
 "motherVessel","lighterVessel","masterMobile",destination,
 "escortName","escortMobile","startDate","endDate",shift,status,details,revision
) ON public.programs TO ir_review_runtime;
