-- Call/draft pilot: runtime may read canonical programs but may not write them.
REVOKE INSERT,UPDATE ON public.programs FROM ir_review_runtime;
