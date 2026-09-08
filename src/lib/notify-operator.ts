/**
 * One email to the operator (OPERATOR_NOTIFY_TO) through the platform mailbox
 * (SMTP_URL). Without either it logs and returns. Never on a customer path.
 */
import { platformDriver } from "@/lib/mailer"

export async function notifyOperator(subject: string, text: string): Promise<boolean> {
  const to = process.env.OPERATOR_NOTIFY_TO
  const driver = platformDriver()
  console.log(JSON.stringify({ t: "notify", subject, configured: !!(to && driver) }))
  if (!to || !driver) return false
  try {
    const from = process.env.OPERATOR_NOTIFY_FROM || to
    await driver.send({ from, to, subject: `[Rapport] ${subject}`, html: `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string)}</pre>`, text })
    return true
  } catch (e) {
    console.error("[notify-operator]", e)
    return false
  }
}
