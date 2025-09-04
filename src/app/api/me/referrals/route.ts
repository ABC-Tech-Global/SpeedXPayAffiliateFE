import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const url = new URL(request.url)
  const res = await fetch(`${API_URL}/me/referrals?${url.searchParams.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}
