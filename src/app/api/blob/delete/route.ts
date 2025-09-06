import { NextResponse } from "next/server"
import { del } from "@vercel/blob"

export const runtime = 'nodejs'

export async function DELETE(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'blob token missing' }, { status: 500 })
    }
    
    const { pathname } = await req.json()
    if (!pathname) {
      return NextResponse.json({ error: 'missing pathname' }, { status: 400 })
    }
    
    // del() picks up BLOB_READ_WRITE_TOKEN from env automatically
    await del(pathname)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
