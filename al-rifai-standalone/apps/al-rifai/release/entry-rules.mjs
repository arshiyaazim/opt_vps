// Private-entry path allowlists (pure, testable). No server, no secrets.
//
// Matching is boundary-exact: an entry "/vessel" allows "/vessel" and
// "/vessel/...", never "/vessel-register". Entries ending in "/" allow a whole
// subtree (API and asset prefixes). Entries containing a dot before their end
// (e.g. "/favicon.") are asset prefixes.

export const WORKSPACE_PATHS = [
  '/dashboard',
  '/vessel-register',
  '/transactions',
  '/employees',
  '/sources-review',
  '/insights',
  '/income-expenditure',
  '/archive',
  '/assistant',
  '/admin',
  // RBAC-2B surfaces. Kept in the shared list so both hosts agree: the review
  // queue, attendance and the submitter's own queue were reachable in Next but the
  // TLS entry answered 404 before the request ever reached it.
  '/review',
  '/attendance',
  '/submissions',
  '/platform/release-review',
];

const CASH_RULES = [
  '/signup',
  ...WORKSPACE_PATHS,
  '/login',
  '/api/auth/',
  '/cash',
  '/vessel',
  '/api/cash/',
  '/api/core',
  '/api/register',
  '/api/escort-register',
  // Workspace pages read these authenticated application APIs.
  '/api/operations',
  '/api/assistant',
  '/api/vessel-programs',
  '/api/review/',
  '/api/attendance/',
  '/api/employees/',
  '/api/health',
  '/_next/',
  '/favicon.',
];

const MAIN_RULES = [
  '/signup',
  ...WORKSPACE_PATHS,
  '/login',
  '/api/auth/',
  '/vessel',
  '/register',
  '/api/',
  '/candidate-api/',
  '/_next/',
  '/favicon.',
];

export function entryRules(host) {
  return host === 'cash' ? CASH_RULES : MAIN_RULES;
}

export function isPathAllowed(url, host) {
  if (!url || !url.startsWith('/') || url.length > 8192) return false;
  const path = url.split('?')[0].split('#')[0];
  // Fail closed on traversal/duplicate-slash tricks before matching.
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { return false; }
  if (/(^|\/)\.\.?(\/|$)/.test(decoded) || decoded.includes('//') || decoded.includes('\\')) return false;
  // The public homepage is the only exact-root path; '/' is never a subtree rule.
  if (path === '/') return true;
  for (const rule of entryRules(host)) {
    if (rule.endsWith('/')) {
      if (path.startsWith(rule)) return true;
      continue;
    }
    if (rule.includes('.') && !rule.startsWith('/api/')) {
      if (path.startsWith(rule)) return true;
      continue;
    }
    if (path === rule || path.startsWith(`${rule}/`)) return true;
  }
  return false;
}
