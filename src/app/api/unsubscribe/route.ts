import { NextResponse } from "next/server"
import { db, contacts } from "@/lib/db"
import { eq } from "drizzle-orm"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe"

export const runtime = "nodejs"

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;background:#0a0f1e;color:#f1f5f9;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="max-width:420px;padding:40px;text-align:center;background:#0f1c30;border:1px solid rgba(43,168,162,0.2);border-radius:16px;">
<h1 style="font-size:22px;margin:0 0 12px;">${title}</h1><p style="margin:0;color:#94a3b8;line-height:1.6;">${body}</p></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  )
}

async function handle(req: Request) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get("c") ?? ""
  const token = searchParams.get("t") ?? ""

  if (!verifyUnsubscribeToken(contactId, token)) {
    return page("Invalid link", "This unsubscribe link is invalid or has expired.", 400)
  }

  try {
    await db.update(contacts).set({ unsubscribed: true, updatedAt: new Date() }).where(eq(contacts.id, contactId))
  } catch (e) {
    console.error("Unsubscribe failed:", e)
    return page("Something went wrong", "We could not process your request. Please try again later.", 500)
  }
  return page("You're unsubscribed", "You won't receive any more emails from this sender.")
}

export const GET = handle
// RFC 8058 one-click unsubscribe support (List-Unsubscribe-Post).
export const POST = handle
