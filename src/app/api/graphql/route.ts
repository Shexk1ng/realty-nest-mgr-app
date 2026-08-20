// Pośredniczy w żądaniach GraphQL do backendu i pilnuje reguł ochrony przed wyciekiem danych

import { type NextRequest, NextResponse } from "next/server";
import { checkDlp } from "@/lib/security/dlp";

const BACKEND_URL =
  process.env.GRAPHQL_INTERNAL_URL ?? "http://localhost:4000/graphql";

function unverifiedRole(bearerToken: string | undefined): string | null {
  if (!bearerToken) return null;
  const token = bearerToken.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      role?: string;
    };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function proxyGraphQL(request: NextRequest): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (authorization) {
    headers["Authorization"] = authorization;
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ errors: [{ message: "Invalid request body" }] }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(BACKEND_URL, {
      method: "POST",
      headers,
      body,
    });
  } catch (err) {
    console.error("[/api/graphql] Backend unreachable:", err);
    return NextResponse.json(
      { errors: [{ message: "GraphQL backend is unreachable. Make sure the backend server is running." }] },
      { status: 502 },
    );
  }

  const text = await res.text();

  if (res.ok) {
    try {
      const parsed = JSON.parse(text) as { data?: Record<string, unknown> };
      const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
      const jwt = authorization ?? undefined;

      let operationName: string | undefined;
      try {
        const reqBody = JSON.parse(body) as { operationName?: string };
        operationName = reqBody.operationName ?? undefined;
      } catch {}

      const DATA_TYPES: Record<string, string> = {
        getContacts: "contacts", getProperties: "properties",
        getEnquiries: "enquiries", getDocuments: "documents",
      };

      let blocked = false;
      if (parsed.data && unverifiedRole(jwt) !== "SYSTEM_ADMIN") {
        for (const [key, dataType] of Object.entries(DATA_TYPES)) {
          const val = parsed.data[key];
          let rows: unknown[] = [];
          if (Array.isArray(val)) rows = val;
          else if (val && typeof val === "object" && Array.isArray((val as { items?: unknown[] }).items)) {
            rows = (val as { items: unknown[] }).items;
          }
          if (rows.length > 0) {
            const recordIds = rows
              .map((r) => (r && typeof r === "object" ? (r as { id?: unknown }).id : undefined))
              .filter((id): id is string => typeof id === "string");
            const result = checkDlp({
              ip,
              dataType,
              recordCount: rows.length,
              recordIds: recordIds.length === rows.length ? recordIds : undefined,
              operationName,
              jwt,
            });
            if (result.blocked) blocked = true;
          }
        }
      }

      if (blocked) {
        return NextResponse.json(
          {
            errors: [
              {
                message: "Request blocked by Data Loss Prevention: too many sensitive records requested in a short window.",
                extensions: { code: "DLP_BLOCKED" },
              },
            ],
          },
          { status: 403 },
        );
      }
    } catch {}
  }

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = proxyGraphQL;

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyGraphQL(request);
}
