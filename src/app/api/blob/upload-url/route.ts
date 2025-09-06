import { NextResponse } from "next/server"

export async function POST() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'blob token missing' }, { status: 500 })
  try {
    const res = await fetch('https://api.vercel.com/v2/blob/upload-url', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access: 'private' }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.error || 'failed to get upload url' }, { status: res.status })
    return NextResponse.json({ url: data.url, pathname: data.pathname })
  } catch {
    return NextResponse.json({ error: 'bad url' }, { status: 400 })
  }
}
