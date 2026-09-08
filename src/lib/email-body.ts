/**
 * The note itself.
 *
 * THE CARD IS ALWAYS IN IT. That is the product: the contact gets a greeting card
 * with their own name printed on the cardstock, and the note sits under it. A note
 * that goes out with no picture is the bug Rob has been reporting, so `cardUrl` is
 * rendered in BOTH layouts and only its dressing changes:
 *
 *   "plain" - the card on a white ground with the note under it, in a system face.
 *             This reads as personal mail, which is what an agent's note should be
 *             and what keeps a filter from treating it as bulk.
 *   "card"  - the same card inside the tenant's branded wrapper. Opt-in.
 *
 * Both are portrait-safe: the image is never cropped, because cropping a greeting
 * card cuts the name off the bottom of it.
 *
 * Every version carries the CAN-SPAM pieces: the sender's postal address and a
 * one-click unsubscribe.
 */

export type BodyStyle = "plain" | "card"

export type NoteParts = {
  body: string
  fromName: string
  businessName: string
  unsubscribeUrl: string
  postalAddress?: string | null
  /** The card made for this contact. Rendered in every layout. */
  cardUrl?: string | null
  /** What the card says - "Happy Birthday, Rob". Becomes the image's alt text, so
   *  a client with images off still shows the line the card was made to say. */
  cardAlt?: string | null
  style?: BodyStyle
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function noteText({ body, fromName, businessName, unsubscribeUrl, postalAddress }: NoteParts): string {
  const footer = [
    `${businessName}${postalAddress ? `, ${postalAddress}` : ""}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n")
  return `${body.trim()}\n\nWarmly,\n${fromName}\n\n--\n${footer}\n`
}

/**
 * The card, then the note. No branding, no gradient, one image.
 *
 * The image is a table cell with an explicit width rather than a bare <img>, because
 * Outlook ignores max-width on an image and would blow a 1200px card across the whole
 * window. width="420" is honoured everywhere, and `height:auto` keeps the portrait
 * card whole - no object-fit, no crop, no cut-off name.
 */
function cardBlock(cardUrl?: string | null, cardAlt?: string | null): string {
  if (!cardUrl) return ""
  const alt = escapeHtml((cardAlt ?? "").trim())
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
<tr><td style="padding:0;">
<img src="${cardUrl}" alt="${alt}" width="420" style="width:100%;max-width:420px;height:auto;display:block;border:0;outline:none;text-decoration:none;border-radius:10px;">
</td></tr></table>`
}

/** Light HTML that reads as a plain message: system font, one card, no branding. */
function plainHtml({ body, fromName, businessName, unsubscribeUrl, postalAddress, cardUrl, cardAlt }: NoteParts): string {
  const paragraphs = body.trim().split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;">
${cardBlock(cardUrl, cardAlt)}
${paragraphs}
<p style="margin:0 0 14px;">Warmly,<br>${escapeHtml(fromName)}</p>
<p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
${escapeHtml(businessName)}${postalAddress ? `, ${escapeHtml(postalAddress)}` : ""}<br>
<a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
</p>
</div>
</body></html>`
}

/** The opt-in version with the tenant's card image above the note. */
function cardHtml(parts: NoteParts): string {
  const { body, cardUrl, cardAlt, businessName, fromName, unsubscribeUrl, postalAddress } = parts
  const paragraphs = body.trim().split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px;color:#f1f5f9;font-size:17px;line-height:1.7;font-family:Georgia,serif;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(businessName)}</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#0f1c30;border-radius:16px;overflow:hidden;border:1px solid rgba(43,168,162,0.2);">
        <tr><td style="background:linear-gradient(135deg,#1E8C86,#2BA8A2);padding:20px 32px;">
          <p style="margin:0;color:white;font-family:'Georgia',serif;font-size:22px;font-weight:bold;">${escapeHtml(businessName)}</p>
        </td></tr>
        ${cardUrl ? `<tr><td align="center" style="padding:28px 32px 4px;"><img src="${cardUrl}" alt="${escapeHtml((cardAlt ?? "").trim())}" width="440" style="width:100%;max-width:440px;height:auto;display:block;border:0;outline:none;text-decoration:none;border-radius:12px;"></td></tr>` : ""}
        <tr><td style="padding:32px;">
          ${paragraphs}
          <p style="margin:28px 0 0;color:#2BA8A2;font-size:15px;font-weight:bold;">Warmly,<br>${escapeHtml(fromName)}</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(43,168,162,0.1);">
          <p style="margin:0;color:rgba(148,163,184,0.5);font-size:11px;">
            ${escapeHtml(businessName)}${postalAddress ? `, ${escapeHtml(postalAddress)}` : ""}.
            <a href="${unsubscribeUrl}" style="color:rgba(148,163,184,0.5);">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Text always; HTML in the matching shape. */
export function buildNote(parts: NoteParts): { text: string; html: string } {
  const style: BodyStyle = parts.style === "card" ? "card" : "plain"
  return {
    text: noteText(parts),
    html: style === "card" ? cardHtml(parts) : plainHtml(parts),
  }
}
