import { LegalShell, VENDOR } from "../legal"
export const metadata = { title: "Refund policy | Rapport" }
export default function Refunds() {
  return (
    <LegalShell kicker="Legal" title="Refund policy">
      <h2>During the 14-day trial</h2>
      <p>Nothing is charged. Cancel from Settings, Billing and the card is never used.</p>
      <h2>First paid month</h2>
      <p>If Rapport did not send a single note in your first paid month because of something on our side (the schedule shows &quot;failed&quot; with a reason that is ours, not your mailbox), email {VENDOR.email} and the month is refunded in full.</p>
      <h2>After that</h2>
      <p>Monthly charges are not refunded once the month has started; cancel and the plan runs to the end of the period. Removing a seat takes effect at the next renewal. If our side was down for more than two consecutive business days in a month, that month is credited.</p>
      <h2>How to ask</h2>
      <p>Email <a href={`mailto:${VENDOR.email}`}>{VENDOR.email}</a> with your business name. We answer within one business day.</p>
    </LegalShell>
  )
}
