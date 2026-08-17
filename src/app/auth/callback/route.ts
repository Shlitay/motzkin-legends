import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("default_home_score, default_away_score")
        .eq("id", data.user.id)
        .single();

      const needsOnboarding =
        !profile || profile.default_home_score === null || profile.default_away_score === null;

      return NextResponse.redirect(`${origin}${needsOnboarding ? "/onboarding" : next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
