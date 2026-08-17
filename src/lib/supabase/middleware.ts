import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/manager/login", "/auth/callback"]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Manager area: must be logged in AND role = 'manager'.
  if (path.startsWith("/manager") && path !== "/manager/login") {
    if (!user) {
      return NextResponse.redirect(new URL("/manager/login", request.url));
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "manager") {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return supabaseResponse;
  }

  // Everything else (participant pages) just needs a logged-in session.
  if (!user && !PUBLIC_PATHS.has(path)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
