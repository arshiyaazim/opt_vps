BEGIN;

CREATE VIEW public.whatsapp_wa01_contact_aliases
WITH (security_barrier=true, security_invoker=false)
AS
 SELECT jid,phone_number
 FROM public.whatsapp_contacts
 WHERE wa_account='wa-01';

ALTER VIEW public.whatsapp_wa01_contact_aliases OWNER TO alrifai_app;

REVOKE ALL ON public.whatsapp_wa01_contact_aliases FROM PUBLIC;
REVOKE SELECT ON public.whatsapp_contacts FROM ir_review_runtime;
GRANT SELECT ON public.whatsapp_wa01_contact_aliases TO ir_review_runtime;

COMMIT;
