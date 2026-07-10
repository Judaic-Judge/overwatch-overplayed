import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();

    await supabase.auth.verifyOtp({
      type: type as "signup" | "magiclink" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}