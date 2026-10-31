// Owner-approved conversation scope and canonical PN/LID identity resolution.
//
// Identifiers are configuration data in the database (public.conversation_scope,
// public.whatsapp_identity_aliases). They are never compiled into source and never
// committed. The loader fails closed: an empty or unreachable scope disables
// ingestion instead of falling back to an implicit or wider scope.

export type Domain = 'CASH' | 'VESSEL';
export type ConversationType = 'DIRECT' | 'GROUP';

export type ApprovedConversation = {
  accountId: string;
  canonicalChatJid: string;
  domain: Domain;
  conversationType: ConversationType;
  displayName: string;
  canonicalPersonRef: string | null;
  aliases: string[];
};

export type CanonicalIdentity = {
  personRef: string;
  pnBare: string | null;
  lidBare: string | null;
  savedName: string | null;
  profileName: string | null;
  verification: 'BRIDGE_LID_MAP' | 'OWNER_PROVIDED' | 'UNRESOLVED';
};

export type SenderResolution = {
  personRef: string | null;
  matched: 'PN' | 'LID' | 'NONE';
  systemRow: boolean;
  savedName: string | null;
  profileName: string | null;
};

export type Queryable = {
  query(sql: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
};

export const CACHE_TTL_MS = 60_000;

export function bareIdentifier(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/@.*$/, '').replace(/:\d+$/, '').trim();
}

export type ConversationScope = {
  readonly conversations: ApprovedConversation[];
  readonly identities: CanonicalIdentity[];
  byChat(chatJid: string): ApprovedConversation | null;
  domainOf(chatJid: string): Domain | null;
  isApproved(chatJid: string): boolean;
  chatsFor(domain: Domain): string[];
  /** Canonical chat plus every alias, for ingestion and routing. */
  ingestionChats(): string[];
  canonicalChatFor(chatJid: string): string | null;
  resolveSender(chatJid: string, senderJid: string | null | undefined): SenderResolution;
  identityForBare(bare: string): CanonicalIdentity | null;
};

export type RosterShadowState = {
  mode: 'STATIC' | 'SHADOW' | 'DB';
  startedAt: string | null;
  autoPromoteAt: string | null;
  durationHours: number;
  cyclesCompleted: number;
  diffsFound: number;
  autoPromoteBlocked: boolean;
  lastCheckAt: string | null;
  lastDiff: string | null;
};

const shadowState: RosterShadowState = {
  mode: (process.env.ALRIFAI_ROSTER_SOURCE || 'STATIC').toUpperCase() as 'STATIC' | 'SHADOW' | 'DB',
  startedAt: process.env.ALRIFAI_ROSTER_SHADOW_START || null,
  autoPromoteAt: null,
  durationHours: Number(process.env.ALRIFAI_ROSTER_SHADOW_DURATION_HOURS || 36),
  cyclesCompleted: 0,
  diffsFound: 0,
  autoPromoteBlocked: false,
  lastCheckAt: null,
  lastDiff: null,
};

if (shadowState.startedAt && shadowState.mode === 'SHADOW') {
  const start = new Date(shadowState.startedAt);
  const promote = new Date(start.getTime() + shadowState.durationHours * 60 * 60 * 1000);
  shadowState.autoPromoteAt = promote.toISOString();
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.startsWith('{')) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(',').map((v) => v.replace(/^"|"$/g, '')) : [];
  }
  return [];
}

export function getRosterShadowState(): RosterShadowState {
  return {...shadowState};
}

export function buildConversationScope(
  conversationRows: Array<Record<string, unknown>>,
  identityRows: Array<Record<string, unknown>>,
): ConversationScope {
  const conversations: ApprovedConversation[] = conversationRows.map((row) => ({
    accountId: String(row.account_id),
    canonicalChatJid: String(row.canonical_chat_jid),
    domain: String(row.domain) as Domain,
    conversationType: String(row.conversation_type) as ConversationType,
    displayName: String(row.display_name),
    canonicalPersonRef: row.canonical_person_ref ? String(row.canonical_person_ref) : null,
    aliases: asStrings(row.alias_chat_jids),
  }));
  if (!conversations.length) throw new Error('APPROVED_SCOPE_EMPTY');

  const identities: CanonicalIdentity[] = identityRows.map((row) => ({
    personRef: String(row.canonical_person_ref),
    pnBare: row.pn_bare ? String(row.pn_bare) : null,
    lidBare: row.lid_bare ? String(row.lid_bare) : null,
    savedName: row.saved_name ? String(row.saved_name) : null,
    profileName: row.profile_name ? String(row.profile_name) : null,
    verification: String(row.verification) as CanonicalIdentity['verification'],
  }));

  const chatIndex = new Map<string, ApprovedConversation>();
  for (const conversation of conversations) {
    chatIndex.set(conversation.canonicalChatJid, conversation);
    for (const alias of conversation.aliases) chatIndex.set(alias, conversation);
  }
  const byPn = new Map<string, CanonicalIdentity>();
  const byLid = new Map<string, CanonicalIdentity>();
  for (const identity of identities) {
    if (identity.pnBare) byPn.set(identity.pnBare, identity);
    if (identity.lidBare) byLid.set(identity.lidBare, identity);
  }

  return {
    conversations,
    identities,
    byChat: (chatJid) => chatIndex.get(chatJid) ?? null,
    domainOf: (chatJid) => chatIndex.get(chatJid)?.domain ?? null,
    isApproved: (chatJid) => chatIndex.has(chatJid),
    chatsFor: (domain) =>
      conversations.filter((c) => c.domain === domain).flatMap((c) => [c.canonicalChatJid, ...c.aliases]),
    ingestionChats: () => conversations.flatMap((c) => [c.canonicalChatJid, ...c.aliases]),
    canonicalChatFor: (chatJid) => chatIndex.get(chatJid)?.canonicalChatJid ?? null,
    identityForBare: (bare) => byPn.get(bare) ?? byLid.get(bare) ?? null,
    resolveSender: (chatJid, senderJid) => {
      const bare = bareIdentifier(senderJid);
      // A group/system row carries the conversation's own identifier as "sender".
      // It is not a person and must never be attributed to a human.
      const systemRow = !!bare && bare === bareIdentifier(chatJid);
      if (systemRow) return { personRef: null, matched: 'NONE', systemRow: true, savedName: null, profileName: null };
      const identity = byPn.get(bare) ?? byLid.get(bare) ?? null;
      if (!identity) return { personRef: null, matched: 'NONE', systemRow: false, savedName: null, profileName: null };
      return {
        personRef: identity.personRef,
        matched: byPn.has(bare) ? 'PN' : 'LID',
        systemRow: false,
        savedName: identity.savedName,
        profileName: identity.profileName,
      };
    },
  };
}

export async function loadConversationScope(db: Queryable): Promise<ConversationScope> {
  const [conversationRows, identityRows] = await Promise.all([
    db.query(
      `SELECT account_id,canonical_chat_jid,domain,conversation_type,display_name,
              canonical_person_ref,alias_chat_jids
       FROM public.conversation_scope
       WHERE active=true AND account_id='wa-01'
       ORDER BY domain DESC,conversation_type,canonical_chat_jid`,
    ),
    db.query(
      `SELECT canonical_person_ref,pn_bare,lid_bare,saved_name,profile_name,verification
       FROM public.whatsapp_identity_aliases
       WHERE scope_account='wa-01'
       ORDER BY canonical_person_ref`,
    ),
  ]);
  return buildConversationScope(conversationRows.rows, identityRows.rows);
}

let cached: { at: number; scope: ConversationScope; source: Queryable } | undefined;

export async function loadConversationScopeWithShadow(db: Queryable, staticScope?: ConversationScope): Promise<ConversationScope> {
  shadowState.cyclesCompleted++;
  shadowState.lastCheckAt = new Date().toISOString();
  
  const dbScope = await loadConversationScope(db);
  
  if (shadowState.mode === 'SHADOW') {
    if (staticScope) {
      const staticChats = new Set(staticScope.ingestionChats().sort());
      const dbChats = new Set(dbScope.ingestionChats().sort());
      const missingInStatic = [...dbChats].filter(c => !staticChats.has(c));
      const extraInStatic = [...staticChats].filter(c => !dbChats.has(c));
      
      if (missingInStatic.length > 0 || extraInStatic.length > 0) {
        shadowState.diffsFound++;
        shadowState.lastDiff = `cycle=${shadowState.cyclesCompleted} static_count=${staticChats.size} db_count=${dbChats.size} missing_in_static=${JSON.stringify(missingInStatic)} extra_in_static=${JSON.stringify(extraInStatic)}`;
        console.log(`ROSTER_SHADOW_DIFF ${shadowState.lastDiff}`);
        if (shadowState.diffsFound > 0) {
          shadowState.autoPromoteBlocked = true;
        }
      } else {
        // periodic log every 10 minutes (approx every ~10 cycles, adjust based on frequency)
        if (shadowState.cyclesCompleted % 10 === 0) {
          const nextCheck = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          console.log(`ROSTER_SHADOW_OK cycles=${shadowState.cyclesCompleted} diffs=${shadowState.diffsFound} next_check=${nextCheck}`);
        }
      }
    }
    
    // Check auto-promotion
    if (shadowState.autoPromoteAt && shadowState.diffsFound === 0 && !shadowState.autoPromoteBlocked) {
      const now = new Date();
      const promoteAt = new Date(shadowState.autoPromoteAt);
      if (now > promoteAt) {
        shadowState.mode = 'DB';
        console.log(`ROSTER_AUTO_PROMOTED after ${shadowState.durationHours} hours, 0 diffs`);
      }
    } else if (shadowState.autoPromoteAt && shadowState.diffsFound > 0) {
      if (!shadowState.autoPromoteBlocked) {
        shadowState.autoPromoteBlocked = true;
      }
      console.log(`ROSTER_AUTO_PROMOTE_BLOCKED: ${shadowState.diffsFound} diffs found`);
    }
    
    // In SHADOW mode, still route using static for safety - return static if provided
    return staticScope || dbScope;
  } else if (shadowState.mode === 'DB') {
    return dbScope;
  }
  
  return staticScope || dbScope;
}

/** Cached scope read. The cache is bound to the pool that produced it. */
export async function currentConversationScope(db: Queryable): Promise<ConversationScope> {
  const now = Date.now();
  if (cached && cached.source === db && now - cached.at < CACHE_TTL_MS) return cached.scope;
  const scope = await loadConversationScope(db);
  cached = { at: now, scope, source: db };
  return scope;
}

export function clearConversationScopeCache(): void {
  cached = undefined;
}
