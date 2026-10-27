import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../database.types";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Refreshes the Supabase session cookie on every request and returns the verified user id.
 * `requestHeaders` lets the caller pass extra headers (the CSP nonce) to the page.
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Pass the refreshed cookies on to the page. `requestHeaders` was copied before the
        // refresh, so without this the page sees the old, expired token and tries to refresh
        // it again with a refresh token that was already used, which ends the session.
        requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Don't put code between createServerClient and getClaims: getClaims verifies the JWT and
  // triggers the refresh that keeps users signed in.
  const { data, error } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  // A session cookie that doesn't yield a user means the person gets signed out. Log why
  // (never the token itself) so it shows up in the Vercel logs.
  if (!userId && request.cookies.getAll().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))) {
    console.warn("Session cookie present but no user", request.nextUrl.pathname, error?.name, error?.message);
  }

  return { response, userId };
}
