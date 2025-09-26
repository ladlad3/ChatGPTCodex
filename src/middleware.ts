import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rolePasswords: Record<string, string | undefined> = {
  admin: process.env.ADMIN_PASSWORD,
  editor: process.env.EDITOR_PASSWORD,
  viewer: process.env.VIEWER_PASSWORD
};

function decodeBasic(auth: string | null) {
  if (!auth?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    return { user, pass };
  } catch (error) {
    console.error("basic auth decode error", error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const credentials = decodeBasic(request.headers.get("authorization"));
  if (!credentials) {
    return new Response("認証が必要です", {
      status: 401,
      headers: { "WWW-Authenticate": "Basic realm=\"schedule\"" }
    });
  }

  const expected = rolePasswords[credentials.user as keyof typeof rolePasswords];
  if (!expected || expected !== credentials.pass) {
    return new Response("認証失敗", { status: 403 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-role", credentials.user);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!api/auth).*)"
};
