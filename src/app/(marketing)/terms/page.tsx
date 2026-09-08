import { LegalShell, VENDOR } from "../legal"
export const metadata = { title: "Terms of service | Rapport" }
export default function Terms() {
  return (
    <LegalShell kicker="Legal" title="Terms of service">
      <h2>What Rapport is</h2>
      <p>Rapport is a relationship autopilot: it keeps a profile on each of your clients, watches for birthdays, anniversaries and children&rsquo;s birthdays, has an AI write a short note per person, and sends it from your own mailbox. It is operated by {VENDOR.name}, {VENDOR.address}.</p>
      <h2>Plan and billing</h2>
      <p>$29 per seat per month, 250 contacts per seat, after a 14-day free trial. Your card is charged when the trial ends and monthly after that, through Stripe. Add or remove seats and cancel any time from Settings, Billing; the plan runs to the end of the paid period. When a trial ends without a card, or a payment fails, Rapport stops sending until billing is fixed. Refunds are in the <a href="/refunds">refund policy</a>.</p>
      <h2>Your book, your sender</h2>
      <p>Notes go out from the mailbox you connect, under your name, to people you have a relationship with. You are the sender for every legal purpose: you confirm that each contact is someone you may write to, you keep the mailing address in Settings, Business profile current (it prints in every footer, as the CAN-SPAM Act requires), and you stop writing to anyone who unsubscribes. Rapport adds the unsubscribe link and honors it; we cannot honor it for a note you send outside Rapport.</p>
      <h2>An AI writes the notes</h2>
      <p>Each note is drafted by a language model from the profile you keep. Your first day of notes is held for your approval; after that they send on schedule. Read the first batch. If a note is wrong or unwelcome, the schedule shows every note and you can add a topic to a contact&rsquo;s &ldquo;avoid&rdquo; list. You are responsible for what goes out under your name.</p>
      <h2>Profiles hold personal details</h2>
      <p>You may store what you know about a client, including family, hometown, school and interests. Keep it to what the person would expect you to remember. The <a href="/privacy">privacy policy</a> names the fields Rapport can store; do not put in anything you are not entitled to hold.</p>
      <h2>Acceptable use</h2>
      <p>No purchased or scraped lists, no bulk marketing, no notes to people who have not done business with you, nothing deceptive or harassing. Rapport is for the book you already have. We can pause an account that is used another way, and we tell you when we do.</p>
      <h2>Availability and liability</h2>
      <p>Rapport depends on your mailbox provider, the AI provider and our hosting. If one of them is down, a note may go out late; the schedule shows what happened. To the fullest extent the law allows, our total liability is the amount you paid in the three months before the claim, and we are not liable for indirect or consequential loss, including a relationship that did not renew.</p>
      <h2>Contact and governing law</h2>
      <p><a href={`mailto:${VENDOR.email}`}>{VENDOR.email}</a>, {VENDOR.phone}. California law governs.</p>
    </LegalShell>
  )
}
