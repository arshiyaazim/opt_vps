import IdentityReviewPanel from '@/candidates/identity-review/ui/IdentityReviewPanel';
import {PlatformPage} from '@/app/platform/protected';

export const dynamic='force-dynamic';

/**
 * Review Queue — admin only (RBAC-2).
 *
 * The page is gated server-side by PlatformPage access='admin', so a USER typing the
 * URL is redirected to /dashboard. The queue itself is rebuilt in RBAC-2B on top of
 * review_items; until then this keeps the existing identity panel reachable only by an
 * admin instead of leaving the route protected by the proxy alone.
 */
export default function ReviewPage(){
  return <PlatformPage pathname="/review" label="Review Queue" access="admin">
    <IdentityReviewPanel/>
  </PlatformPage>;
}
