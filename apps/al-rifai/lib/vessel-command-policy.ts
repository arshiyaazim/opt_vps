// Vessel command authorization policy (pure). No database, no client-supplied
// actor identity: the actor is resolved server-side from configuration.

import type {ChatGPTUser} from '@/app/chatgpt-auth';

export type CommandActor = {ref: string};
export type VesselCommandUser = Pick<ChatGPTUser,'userId'>;
export type VesselReadUser = Pick<ChatGPTUser,'userId'|'role'|'capabilities'>;

export class VesselCommandError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 403) {
    super(code);
    this.name = 'VesselCommandError';
    this.code = code;
    this.status = status;
  }
}

/** General users and admins may read Vessel details only with the read capability. */
export function canReadVessel(user: VesselReadUser | null | undefined): boolean {
  if (!user) return false;
  if (user.userId === 'local-validator') return true;
  return (user.role === 'ADMIN' || user.role === 'USER')
    && (user.capabilities ?? []).includes('vessel.read');
}

export function assertCanReadVessel(user: VesselReadUser | null | undefined): void {
  if (!user) throw new VesselCommandError('AUTHENTICATION_REQUIRED', 401);
  if (!canReadVessel(user)) throw new VesselCommandError('VESSEL_READ_FORBIDDEN', 403);
}

/** Application-level role gate. The validation identity is the Owner/admin. */
export function canCommandVessel(user: VesselCommandUser | null | undefined): boolean {
  return !!user && user.userId === 'local-validator';
}

export function assertCanCommandVessel(user: VesselCommandUser | null | undefined): void {
  if (!user) throw new VesselCommandError('AUTHENTICATION_REQUIRED', 401);
  if (!canCommandVessel(user)) throw new VesselCommandError('VESSEL_COMMAND_FORBIDDEN', 403);
}

/**
 * Server-owned actor identity. Never accepted from the request body.
 * Falls back to the configured Cash Owner person reference (the same verified
 * Owner identity used by Cash), so no new secret or client input is needed.
 */
export function commandActorFromEnv(env: Record<string, string | undefined>): CommandActor {
  const ref = (env.ALRIFAI_VESSEL_COMMAND_ACTOR || env.ALRIFAI_CASH_OWNER_PERSON_REF || '').trim();
  if (!ref) throw new VesselCommandError('VESSEL_COMMAND_ACTOR_NOT_CONFIGURED', 503);
  return {ref};
}

export const MIGRATION_DEPENDENCY = 'MIGRATION_0032_VESSEL_PROGRAM_COMMANDS_NOT_APPLIED';

/** Maps PostgreSQL outcomes to HTTP-safe errors without leaking SQL details. */
export function mapCommandError(error: unknown): VesselCommandError {
  const code = (error as {code?: string})?.code;
  if (code === '42P01' || code === '42883' || code === '3F000') {
    return new VesselCommandError(MIGRATION_DEPENDENCY, 503);
  }
  if (code === '42501') return new VesselCommandError('VESSEL_COMMAND_FORBIDDEN', 403);
  const message = error instanceof Error ? error.message : '';
  const known = /^(VERIFIED_ACTOR_REQUIRED|REVISION_CONFLICT|PROGRAM_NOT_FOUND|PROGRAM_ALREADY_VOIDED|ASSIGNMENT_EXISTS_USE_REPLACE|COMMAND_KEY_REQUIRED|FIELD_NOT_EDITABLE|PATCH_REQUIRED|RELEASE_FIELDS_REQUIRED|EMPLOYEE_MOBILE_INVALID|SHIFT_REQUIRED|VOID_REASON_REQUIRED|VESSEL_PAIR_REQUIRED|PROGRAM_ID_REQUIRED|SHIFT_INVALID)$/.exec(message);
  if (known) {
    const status = message === 'PROGRAM_NOT_FOUND' ? 404
      : message === 'REVISION_CONFLICT' || message === 'PROGRAM_ALREADY_VOIDED' || message === 'ASSIGNMENT_EXISTS_USE_REPLACE' ? 409
        : 400;
    return new VesselCommandError(message, status);
  }
  return new VesselCommandError('VESSEL_COMMAND_FAILED', 500);
}
