import { LegalShell, VENDOR } from "../legal"
export const metadata = { title: "Privacy policy | Rapport" }
export default function Privacy() {
  return (
    <LegalShell kicker="Legal" title="Privacy policy">
      <h2>Two kinds of people</h2>
      <p>Customers, who use Rapport, and contacts, the clients in a customer&apos;s book. Contacts never sign up for anything; their details come from the customer, who is responsible for them.</p>
      <h2>What a customer&apos;s account holds</h2>
      <p>Your name and email (through Clerk), your business name, sending name, reply-to and mailing address, your Stripe customer and subscription ids (card numbers never touch us), your mailbox credentials (encrypted at rest; used only to send your notes), and, if you add one, your own AI provider key (encrypted at rest).</p>
      <h2>What a contact profile can hold</h2>
      <p>Name, email, phone, birthday, anniversary, spouse and children, hometown, schools, employer and title, interests, notes, social links, and a list of topics to avoid. The profile schema also has fields for military service, religion, politics and health-adjacent notes because some relationship methods track them; Rapport does not require them, does not use them to write notes, and you should leave them empty unless you have a lawful reason to hold them. Every stored field is exportable and deletable by the customer.</p>
      <h2>What we do with it</h2>
      <p>Write and send the customer&apos;s notes, show the schedule and send log, bill the customer, and support them. The AI provider receives the parts of a profile needed to write one note (first name, the occasion, and the details you chose to keep) and nothing else. Nothing is sold, shared for advertising, or used to train models by us.</p>
      <h2>Unsubscribe and deletion</h2>
      <p>Every note carries a one-click unsubscribe; a contact who uses it is never written to again through Rapport, and the customer sees it. A contact who wants their profile removed writes to {VENDOR.email} or to the customer; we remove it. A customer can delete any contact, export the book as CSV at any time, and close the account by emailing us; closed accounts are purged within 30 days.</p>
      <h2>Processors</h2>
      <p>Clerk (sign-in), Stripe (billing), Neon (database), Vercel (hosting), the customer&apos;s own mailbox provider (sending), and the AI provider the customer chose or OpenRouter by default. Each acts under its own policy.</p>
      <h2>Cookies</h2>
      <p>Sign-in session cookies from Clerk. No advertising or tracking cookies, and no tracking pixel in the notes.</p>
    </LegalShell>
  )
}
