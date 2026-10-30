import {NextRequest} from "next/server";
import {randomBytes} from "node:crypto";
import {clearCookie,cookieHeader,database,hashToken,json,noStoreHeaders} from "@/lib/cash-portal";
import {
  assertCsrf,
  authErrorBody,
  changeOwnPassword,
  changeOwnUsername,
  currentCsrf,
  currentSession,
  loginWithCashCredential,
  logoutCurrent,
  requireUnifiedOrigin,
  unifiedMode,
} from "@/lib/unified-auth";
import {sanitizeReturnTo,UnifiedAuthError} from "@/lib/unified-auth-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function reply(data: unknown, status = 200, headers: HeadersInit = {}) {
  return json(data, status, {...noStoreHeaders(), ...headers});
}

async function readBody(request: Request): Promise<Row> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Row) : {};
  } catch {
    throw new UnifiedAuthError("INVALID_JSON", 400);
  }
}

async function readSignupBody(request: Request): Promise<Row> {
  const reader = request.body?.getReader();
  if (!reader) throw new UnifiedAuthError("INVALID_JSON", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new UnifiedAuthError("REQUEST_TOO_LARGE", 413);
    }
    chunks.push(part.value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
  } catch {
    throw new UnifiedAuthError("INVALID_JSON", 400);
  }
}

async function handle(request: NextRequest, segments: string[]) {
  const action = segments[0] || "";
  if (unifiedMode() === "off") return reply({error: "UNIFIED_AUTH_DISABLED"}, 404);

  if (request.method === "POST" && action === "signup") {
    requireUnifiedOrigin(request);
    const body = await readSignupBody(request);
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (
      displayName.length < 2 ||
      displayName.length > 150 ||
      /[\u0000-\u001f\u007f]/.test(displayName) ||
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return reply({error: "SIGNUP_FIELDS_INVALID"}, 400);
    }

    try {
      await database().query(
        `INSERT INTO public.account_signup_requests(id,display_name,email)
         VALUES($1,$2,$3)
         ON CONFLICT (email_normalized) DO NOTHING`,
        [hashToken(randomBytes(32).toString("hex")), displayName, email],
      );
      return reply({ok: true, status: "PENDING_REVIEW"}, 202);
    } catch (error) {
      const code = error && typeof error === "object" ? (error as {code?: string}).code : undefined;
      if (code === "42P01") {
        return reply({error: "SIGNUP_SCHEMA_REQUIRED", migration: "db/migration-candidates/0034_signup_requests.sql"}, 503);
      }
      if (code === "42501") return reply({error: "SIGNUP_PERMISSION_REQUIRED"}, 503);
      throw error;
    }
  }

  // Sign in with the existing Cash Portal credential. Same store, same hash,
  // same session table — no second password is introduced.
  if (request.method === "POST" && action === "login") {
    const body = await readBody(request);
    const result = await loginWithCashCredential(request, {
      username: body.username,
      password: body.password,
    });
    return reply(
      {
        user: result.user,
        csrf: result.csrf,
        redirect: sanitizeReturnTo(typeof body.next === "string" ? body.next : "/dashboard"),
      },
      200,
      {"Set-Cookie": cookieHeader(result.token)},
    );
  }

  if (request.method === "POST" && action === "logout") {
    requireUnifiedOrigin(request);
    const {token} = await currentSession(request);
    await assertCsrf(request, token);
    await logoutCurrent(token);
    return reply({ok: true}, 200, {"Set-Cookie": clearCookie()});
  }

  if (request.method === "GET" && action === "session") {
    const {identity, csrf} = await currentCsrf(request);
    return reply({user: identity, csrf});
  }

  // Voluntary, authenticated, password-confirmed credential changes only.
  if (request.method === "POST" && action === "password") {
    requireUnifiedOrigin(request);
    const {identity, token} = await currentSession(request);
    await assertCsrf(request, token);
    const body = await readBody(request);
    const result = await changeOwnPassword(identity, body, token);
    return reply({ok: true, otherSessionsRevoked: result.otherSessionsRevoked});
  }

  if (request.method === "POST" && action === "username") {
    requireUnifiedOrigin(request);
    const {identity, token} = await currentSession(request);
    await assertCsrf(request, token);
    const body = await readBody(request);
    const username = await changeOwnUsername(identity, body);
    return reply({ok: true, username});
  }

  throw new UnifiedAuthError("NOT_FOUND", 404);
}

async function guarded(request: NextRequest, segments: string[]) {
  try {
    return await handle(request, segments);
  } catch (error) {
    const mapped = authErrorBody(error);
    return reply({error: mapped.error}, mapped.status, mapped.headers);
  }
}

export async function GET(request: NextRequest, {params}: {params: Promise<{path: string[]}>}) {
  return guarded(request, (await params).path || []);
}

export async function POST(request: NextRequest, {params}: {params: Promise<{path: string[]}>}) {
  return guarded(request, (await params).path || []);
}
