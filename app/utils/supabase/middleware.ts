
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });



  // Custom session routing:
  const flatSession = request.cookies.get("flat_session")?.value;
  const profileMemberId = request.cookies.get("profile_member_id")?.value;
  const pathname = request.nextUrl.pathname;

  // Prevent routing loops and allow API routes to handle their own auth
  if (!flatSession && pathname !== "/login" && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (flatSession && !profileMemberId && pathname !== "/profiles" && pathname !== "/login" && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/profiles";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
