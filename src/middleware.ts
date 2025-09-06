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
    const secretStr = process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? "dev_secret_change_me" : "");
    if (!secretStr) {
      throw new Error("JWT_SECRET is required in production");
    }
    const secret = new TextEncoder().encode(secretStr);
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
