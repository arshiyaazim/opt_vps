export interface VerifiedLidMapping {
  lid: string;
  pn: string;
  observedAt: string;
}

export interface IdentitySyncQueryResult {
  rows: Array<{ identity_state?: string; sender_pn?: string | null }>;
  rowCount: number | null;
}

export interface IdentitySyncClient {
  query(sql: string, values?: unknown[]): Promise<IdentitySyncQueryResult>;
}

export interface IdentitySyncResult {
  observed: number;
  inserted: number;
  unchanged: number;
  conflicts: number;
}

function validateMapping(mapping: VerifiedLidMapping): void {
  if (!/^\d+$/.test(mapping.lid) || !/^\d+$/.test(mapping.pn)) {
    throw new Error('Verified LID/PN mappings must contain protocol-native numeric identifiers');
  }
  if (!Number.isFinite(Date.parse(mapping.observedAt))) {
    throw new Error('Verified LID/PN mapping has an invalid observedAt timestamp');
  }
}

function stableMappings(mappings: VerifiedLidMapping[]): VerifiedLidMapping[] {
  const byKey = new Map<string, VerifiedLidMapping>();
  for (const mapping of mappings) {
    validateMapping(mapping);
    const key = `${mapping.lid}\0${mapping.pn}\0${mapping.observedAt}`;
    byKey.set(key, mapping);
  }
  return [...byKey.values()].sort(
    (left, right) =>
      left.lid.localeCompare(right.lid) ||
      left.pn.localeCompare(right.pn) ||
      left.observedAt.localeCompare(right.observedAt),
  );
}

export async function syncVerifiedWa01Mappings(
  client: IdentitySyncClient,
  mappings: VerifiedLidMapping[],
  streamId: string,
): Promise<IdentitySyncResult> {
  if (!streamId.trim()) {
    throw new Error('A stable streamId is required for restart-safe identity synchronization');
  }
  const observations = stableMappings(mappings);
  if (observations.length === 0) {
    return { observed: 0, inserted: 0, unchanged: 0, conflicts: 0 };
  }

  let inserted = 0;
  let unchanged = 0;
  let conflicts = 0;
  await client.query('BEGIN');
  try {
    for (const mapping of observations) {
      await client.query(
        `SELECT pg_advisory_xact_lock(
           hashtextextended('wa-identity-map/wa-01/' || $1, 0)
         )`,
        [mapping.lid],
      );
      const current = await client.query(
        `SELECT sender_pn, identity_state
         FROM public.wa_identity_map
         WHERE bridge_account = 'wa-01' AND sender_lid = $1
         FOR UPDATE`,
        [mapping.lid],
      );
      const previous = current.rows[0];
      const conflict =
        previous !== undefined &&
        (previous.identity_state === 'AMBIGUOUS' ||
          (previous.sender_pn !== null &&
            previous.sender_pn !== undefined &&
            previous.sender_pn !== mapping.pn));

      await client.query(
        `INSERT INTO public.wa_identity_map_events
          (bridge_account, sender_lid, sender_pn, identity_state, map_source, map_observed_at, stream_id)
         VALUES ('wa-01', $1, $2, $5, 'whatsmeow_lid_map', $3, $4)
         ON CONFLICT (bridge_account, sender_lid, sender_pn, map_source, stream_id) DO NOTHING`,
        [mapping.lid, mapping.pn, mapping.observedAt, streamId, conflict ? 'AMBIGUOUS' : 'RESOLVED'],
      );

      const result = await client.query(
        `INSERT INTO public.wa_identity_map
          (bridge_account, sender_lid, sender_pn, identity_state, map_source, map_observed_at, stream_id)
         VALUES ('wa-01', $1, $2, 'RESOLVED', 'whatsmeow_lid_map', $3, $4)
         ON CONFLICT (bridge_account, sender_lid) DO UPDATE SET
           sender_pn = CASE
             WHEN wa_identity_map.identity_state = 'AMBIGUOUS' THEN NULL
             WHEN wa_identity_map.sender_pn IS NULL
               OR wa_identity_map.sender_pn = EXCLUDED.sender_pn THEN EXCLUDED.sender_pn
             ELSE NULL
           END,
           identity_state = CASE
             WHEN wa_identity_map.identity_state = 'AMBIGUOUS'
               OR (wa_identity_map.sender_pn IS NOT NULL
                 AND wa_identity_map.sender_pn <> EXCLUDED.sender_pn) THEN 'AMBIGUOUS'
             ELSE 'RESOLVED'
           END,
           map_source = EXCLUDED.map_source,
           map_observed_at = GREATEST(wa_identity_map.map_observed_at, EXCLUDED.map_observed_at),
           stream_id = EXCLUDED.stream_id,
           updated_at = CURRENT_TIMESTAMP
         WHERE
           wa_identity_map.sender_pn IS DISTINCT FROM CASE
             WHEN wa_identity_map.identity_state = 'AMBIGUOUS' THEN NULL
             WHEN wa_identity_map.sender_pn IS NULL
               OR wa_identity_map.sender_pn = EXCLUDED.sender_pn THEN EXCLUDED.sender_pn
             ELSE NULL
           END
           OR wa_identity_map.identity_state IS DISTINCT FROM CASE
             WHEN wa_identity_map.identity_state = 'AMBIGUOUS'
               OR (wa_identity_map.sender_pn IS NOT NULL
                 AND wa_identity_map.sender_pn <> EXCLUDED.sender_pn) THEN 'AMBIGUOUS'
             ELSE 'RESOLVED'
           END
           OR wa_identity_map.map_source IS DISTINCT FROM EXCLUDED.map_source
           OR wa_identity_map.map_observed_at IS DISTINCT FROM
             GREATEST(wa_identity_map.map_observed_at, EXCLUDED.map_observed_at)
           OR wa_identity_map.stream_id IS DISTINCT FROM EXCLUDED.stream_id
         RETURNING identity_state`,
        [mapping.lid, mapping.pn, mapping.observedAt, streamId],
      );
      const state = result.rows[0]?.identity_state;
      if (conflict || state === 'AMBIGUOUS') {
        conflicts += 1;
      } else if (!previous) {
        inserted += 1;
      } else {
        unchanged += 1;
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Identity synchronization failed and its transaction rollback also failed',
      );
    }
    throw error;
  }

  return { observed: observations.length, inserted, unchanged, conflicts };
}
