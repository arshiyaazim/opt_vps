// Deterministic release/conveyance evidence — the rule orchestrator.
//
// Everything here is a pure function over one WhatsApp message (or a small
// follow-up chain). It reuses the existing release parser for identity, food
// bill, conveyance amount and message-date handling, and adds only the date
// evidence that parser now exposes (stated end date, travel date, office return
// date). No business rule is re-implemented.
//
// Owner decisions it encodes:
//   * a missing travel date is NOT a reason to discard an otherwise valid
//     release (historical dates are not always provable);
//   * an amount without a verified date stays UNRESOLVED and is allocated to no
//     month;
//   * the arrival timestamp is only used as the release date because the
//     approved release rule says the slip is sent on the release day — for
//     conveyance it is never used as the travel date;
//   * nothing here posts, approves or settles Cash. `cashPosting` is always
//     false and no Cash module is imported.

import {parseMessage, type MatchStatus} from './release-parser.ts';
import {dhakaLocalTime, isValidDutyDate, monthOf} from './shift-boundary.ts';

export type ExtractionStatus = 'COMPLETE' | 'PARTIAL' | 'UNRESOLVED_CONVEYANCE' | 'INVALID_DATES' | 'NO_EVIDENCE';
export type DateSource = 'STATED_END_DATE' | 'MESSAGE_TIMESTAMP';

export type ReleaseFact = {
  escortPhone: string;
  escortName: string | null;
  /** Release (duty end) date. Stated by the message when possible, else the message date. */
  releaseDate: string;
  releaseDateSource: DateSource;
  releaseShift: 'D' | 'N' | null;
  dutyDays: number | null;
  foodBillBdt: number | null;
  conveyanceAmountBdt: number | null;
  /** Date the travel actually happened, when the message states it. */
  conveyanceDate: string | null;
  /** Date the escort returned to the office, when the message states it. */
  officeReturnDate: string | null;
  evidenceMessageId: string;
  sourceTimestamp: string;
  sourceMessageIds: string[];
  extractionStatus: ExtractionStatus;
  ruleTrace: string[];
};

export type ExtractInput = {text: string; timestamp: string; messageId: string};

const unique = (values: string[]) => [...new Set(values)];

/**
 * Extract one fact per escort from one message. Same message twice yields
 * byte-identical facts (the function has no clock and no randomness).
 */
export function extractReleaseFacts(input: ExtractInput): ReleaseFact[] {
  const text = String(input?.text ?? '');
  const timestamp = String(input?.timestamp ?? '');
  const messageId = String(input?.messageId ?? '');
  if (!text || !timestamp || !messageId) return [];

  const payments = parseMessage(text, timestamp);
  return payments.map((payment) => {
    const rules = [...(payment.rules ?? [])];
    const stated = payment.statedReleaseDate;
    const releaseDate = stated ?? payment.endDate;
    const releaseDateSource: DateSource = stated ? 'STATED_END_DATE' : 'MESSAGE_TIMESTAMP';
    if (!stated) rules.push('R-MESSAGE-DATE');
    if (payment.conveyance !== null) rules.push('R-CONVEYANCE-AMOUNT');
    if (payment.amountBdt !== null) rules.push('R-FOOD-BILL');

    const conveyanceAmountBdt = payment.conveyance ?? null;
    const conveyanceDate = payment.conveyanceDate ?? null;
    const officeReturnDate = payment.officeReturnDate ?? null;

    let extractionStatus: ExtractionStatus;
    if (rules.includes('R-INVALID-STATED-DATE') || !isValidDutyDate(releaseDate)) {
      extractionStatus = 'INVALID_DATES';
    } else if (conveyanceAmountBdt !== null && (conveyanceDate || officeReturnDate)) {
      extractionStatus = 'COMPLETE';
    } else if (conveyanceAmountBdt !== null) {
      extractionStatus = 'UNRESOLVED_CONVEYANCE';
    } else {
      extractionStatus = 'PARTIAL';
    }

    return {
      escortPhone: payment.escortPhone,
      escortName: payment.escortName,
      releaseDate,
      releaseDateSource,
      releaseShift: payment.statedReleaseShift ?? payment.endShift,
      dutyDays: payment.dutyDays,
      foodBillBdt: payment.amountBdt,
      conveyanceAmountBdt,
      conveyanceDate,
      officeReturnDate,
      evidenceMessageId: messageId,
      sourceTimestamp: timestamp,
      sourceMessageIds: [messageId],
      extractionStatus,
      ruleTrace: unique(rules),
    };
  });
}

/** The month the conveyance is recognised in: the actual travel month, or null. */
export function conveyanceMonthOf(fact: ReleaseFact): string | null {
  // The return journey is the travel that settles the duty; when only a travel
  // date is stated, that date is used instead. Never the arrival timestamp.
  const date = fact.officeReturnDate ?? fact.conveyanceDate;
  if (!date || !isValidDutyDate(date)) return null;
  return monthOf(date);
}

export type MatchAssessment = {
  status: MatchStatus | 'PENDING_REVIEW';
  programId: string | null;
  confidence: 'high' | 'medium' | null;
  candidateIds?: string[];
};

export type ReleaseDecision = {
  classification: 'CONFIRMED_RELEASE' | 'VERIFIED_CONVEYANCE' | 'PARTIAL_INFORMATION' | 'UNRESOLVED_CONVEYANCE' | 'NEEDS_REVIEW';
  /** The existing apply workflow remains the final authority; this is only the evidence gate. */
  releaseEligible: boolean;
  conveyance: {amountBdt: number | null; month: string | null; status: 'ALLOCATED' | 'UNRESOLVED' | 'NONE'};
  programId: string | null;
  reasons: string[];
  /** Structural guarantee: this module can never request a Cash posting. */
  cashPosting: false;
};

/**
 * Decide what this evidence supports. There is deliberately no path that
 * applies a release or allocates a month on ambiguous evidence.
 */
export function classifyReleaseEvent(fact: ReleaseFact, match: MatchAssessment): ReleaseDecision {
  const reasons: string[] = [];
  const month = conveyanceMonthOf(fact);
  const amount = fact.conveyanceAmountBdt;

  const conveyance: ReleaseDecision['conveyance'] = amount === null
    ? {amountBdt: null, month: null, status: 'NONE'}
    : month
      ? {amountBdt: amount, month, status: 'ALLOCATED'}
      : {amountBdt: amount, month: null, status: 'UNRESOLVED'};

  if (fact.extractionStatus === 'INVALID_DATES') reasons.push('DATE_EVIDENCE_INVALID');
  const travelDate = fact.officeReturnDate ?? fact.conveyanceDate;
  if (travelDate && isValidDutyDate(fact.releaseDate) && travelDate < fact.releaseDate) {
    reasons.push('DATE_CONFLICT_CONVEYANCE_BEFORE_RELEASE');
  }
  // A stated release date later than the slip's own arrival is not established
  // evidence; the approved rule is that the slip is sent on the release day.
  const messageDate = dhakaLocalTime(fact.sourceTimestamp)?.date ?? null;
  if (fact.releaseDateSource === 'STATED_END_DATE' && messageDate && fact.releaseDate > messageDate) {
    reasons.push('RELEASE_DATE_AFTER_MESSAGE');
  }
  if (match.status !== 'MATCHED' || !match.programId) {
    const candidates = match.candidateIds?.length ?? 0;
    reasons.push(candidates > 1 ? 'MULTIPLE_PROGRAM_CANDIDATES' : 'NO_PROGRAM_MATCH');
  }

  const blocked = reasons.length > 0;
  let classification: ReleaseDecision['classification'];
  if (blocked) classification = 'NEEDS_REVIEW';
  else if (conveyance.status === 'ALLOCATED') classification = 'VERIFIED_CONVEYANCE';
  else if (conveyance.status === 'UNRESOLVED') classification = 'UNRESOLVED_CONVEYANCE';
  else classification = fact.extractionStatus === 'PARTIAL' ? 'PARTIAL_INFORMATION' : 'CONFIRMED_RELEASE';

  return {
    classification,
    releaseEligible: !blocked,
    conveyance,
    programId: blocked ? null : match.programId,
    reasons,
    cashPosting: false,
  };
}

export type MergeKind = 'FOLLOW_UP' | 'CORRECTION';
export type MergeResult = {fact: ReleaseFact; reasons: string[]};

const mergeable = (prior: ReleaseFact, update: ReleaseFact) =>
  prior.escortPhone === update.escortPhone
  && Date.parse(update.sourceTimestamp) >= Date.parse(prior.sourceTimestamp);

/**
 * Attach a later message to an earlier one: a separate conveyance line, or a
 * correction. The release date is only taken from a message that states one
 * explicitly, so a later slip's arrival date can never silently rewrite it.
 */
export function mergeEvidence(prior: ReleaseFact, update: ReleaseFact, kind: MergeKind): MergeResult {
  const reasons: string[] = [];
  if (!mergeable(prior, update)) return {fact: prior, reasons: ['MERGE_NOT_RELATED_OR_OUT_OF_ORDER']};

  const fact: ReleaseFact = {
    ...prior,
    sourceMessageIds: unique([...prior.sourceMessageIds, update.evidenceMessageId]),
    ruleTrace: unique([...prior.ruleTrace, ...update.ruleTrace, kind === 'CORRECTION' ? 'R-CORRECTION' : 'R-FOLLOW_UP']),
  };

  if (update.releaseDateSource === 'STATED_END_DATE') {
    if (prior.releaseDateSource === 'STATED_END_DATE' && prior.releaseDate !== update.releaseDate && kind === 'FOLLOW_UP') {
      reasons.push('CONFLICTING_STATED_DATES');
    } else {
      fact.releaseDate = update.releaseDate;
      fact.releaseDateSource = 'STATED_END_DATE';
      fact.releaseShift = update.releaseShift ?? fact.releaseShift;
    }
  }
  if (update.foodBillBdt !== null) {
    fact.foodBillBdt = update.foodBillBdt;
    fact.dutyDays = update.dutyDays;
  }
  if (update.conveyanceAmountBdt !== null) fact.conveyanceAmountBdt = update.conveyanceAmountBdt;
  if (update.conveyanceDate) fact.conveyanceDate = update.conveyanceDate;
  if (update.officeReturnDate) fact.officeReturnDate = update.officeReturnDate;

  fact.extractionStatus = statusOf(fact);
  return {fact, reasons};
}

function statusOf(fact: ReleaseFact): ExtractionStatus {
  if (fact.ruleTrace.includes('R-INVALID-STATED-DATE') || !isValidDutyDate(fact.releaseDate)) return 'INVALID_DATES';
  if (fact.conveyanceAmountBdt !== null && (fact.conveyanceDate || fact.officeReturnDate)) return 'COMPLETE';
  if (fact.conveyanceAmountBdt !== null) return 'UNRESOLVED_CONVEYANCE';
  return 'PARTIAL';
}

/** Stable key for the insert: one row per (message, escort, release date). */
export function evidenceKey(fact: ReleaseFact): string {
  return `${fact.evidenceMessageId}|${fact.escortPhone}|${fact.releaseDate}`;
}

/** True when two extractions describe the same stored evidence (replay or duplicate). */
export function isSameEvidence(left: ReleaseFact, right: ReleaseFact): boolean {
  return evidenceKey(left) === evidenceKey(right)
    && left.releaseShift === right.releaseShift
    && left.conveyanceAmountBdt === right.conveyanceAmountBdt
    && left.conveyanceDate === right.conveyanceDate
    && left.officeReturnDate === right.officeReturnDate
    && left.extractionStatus === right.extractionStatus;
}
