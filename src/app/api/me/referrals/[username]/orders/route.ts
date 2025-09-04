import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const url = new URL(request.url)
  const res = await fetch(`${API_URL}/me/referrals/${encodeURIComponent(params.username)}/orders?${url.searchParams.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { orders: [], total: 0, page: 1, limit: 10 }, { status: res.status })
}

