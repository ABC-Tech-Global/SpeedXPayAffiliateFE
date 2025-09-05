import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  if (!token) {
    const to = `/login${pathname}${search || ""}`;
    return NextResponse.redirect(new URL(to, request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev_secret_change_me");
    await jwtVerify(token, secret, { algorithms: ["HS256"], clockTolerance: 5 });
    return NextResponse.next();
  } catch {
    const to = `/login${pathname}${search || ""}`;
    return NextResponse.redirect(new URL(to, request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/referrals/:path*",
    "/profile/:path*",
    "/payouts/:path*",
    "/kyc/:path*",
  ],
};
