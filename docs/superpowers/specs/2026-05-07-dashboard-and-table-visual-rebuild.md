# Feature Spec: Dashboard Visual Rebuild + Contacts Spreadsheet Table

**Project:** Rapport — McKay 66 Relationship Engine  
**Date:** 2026-05-07  
**Status:** Approved — implement immediately

---

## Problem

1. **Dashboard** — KPI cards overflow each other, layout is broken, nothing looks like the approved wireframe mockup. Empty space below panels. No visual polish.

2. **Contacts table** — looks like a plain flat list. No cell borders, no column separators, columns are uniform width regardless of content type, text wraps when it should clip.

---

## Feature 1: Dashboard — Full Layout Fix

### Current State
- `grid grid-cols-4` KPI strip with no responsive fallback and no overflow protection
- `grid grid-cols-3` content row with no height constraint
- Everything is visually flat, no real card depth

### Requirements

#### Layout
- [ ] Page uses `flex flex-col h-full` so it fills the viewport without scrolling on normal screens
- [ ] KPI strip: `grid grid-cols-2 lg:grid-cols-4 gap-4` — 2 cols on tablet, 4 on desktop
- [ ] Each KPI card: `min-w-0 overflow-hidden` to prevent any bleed
- [ ] Content row: `grid grid-cols-1 lg:grid-cols-3 gap-5` with `items-stretch`
- [ ] "Going Out Today" spans `lg:col-span-2`, "Coming Up" spans `lg:col-span-1`
- [ ] Both panels: `min-h-[280px]` so they never collapse to nothing

#### KPI Cards
- [ ] Color accent bar: 3px solid border-top (teal / gold / sky / coral per card)
- [ ] Label: 10px uppercase tracking-widest, muted color
- [ ] Value: 28px bold white, `tabular-nums`
- [ ] Sub-label: 11px muted, truncated with ellipsis
- [ ] Icon: 36×36px tinted circle, top-right, never overlaps text
- [ ] Cards have `glass-card` depth (backdrop blur, teal border on hover)

#### Going Out Today panel
- [ ] Header row: pulsing teal dot + "Going Out Today" bold + count badge (badge-teal)
- [ ] Each send row: avatar initials circle + name + occasion label + status dot (green/gold/red)
- [ ] Row hover: subtle teal background tint
- [ ] Empty state: CheckCircle icon + "All clear for today" + "View Schedule →" GlassButton ghost

#### Coming Up panel
- [ ] Header: Calendar icon (gold) + "Coming Up" + count badge
- [ ] Each item: date chip (month abbreviation + day number, stacked) + name + occasion label
- [ ] Divider between items: 1px surface-border line
- [ ] Empty state: Calendar icon + "No upcoming occasions" + "Import Contacts →" GlassButton ghost
- [ ] Scrollable if more than 8 items (`overflow-y-auto max-h-[320px]`)

#### Header
- [ ] Left: "Dashboard" in Playfair Display + date below in muted 13px
- [ ] Right: "Load test data" (ghost, dev-only) + "+ Add Contact" (teal primary)
- [ ] Buttons never wrap onto second line (use `flex items-center gap-3 shrink-0`)

---

## Feature 2: Contacts Table — Spreadsheet Grid

### Current State
- Uses `rapport-table` CSS class but no visible column borders
- Columns are uniform width based on content, with `max-width: 200px` Tailwind cap
- Cells have `border-bottom` only (row separator) — no column separators
- Text truncates but columns have no fixed widths so layout shifts per row

### Requirements

#### Grid Structure
- [ ] Every `<td>` and `<th>` has a visible border on ALL four sides: `border border-[rgba(43,168,162,0.15)]`
- [ ] Header row: slightly different background (`rgba(9,17,31,0.95)`) + bolder border-bottom
- [ ] `border-collapse: collapse` on the table (ensures borders don't double up)
- [ ] Row hover: teal tint on ALL cells in the row simultaneously (use `:hover td` CSS)
- [ ] Selected row: stronger teal background on all cells

#### Fixed Column Widths
Each column has a fixed `width` + `min-width` + `max-width` all set to the same value (prevents reflow). Text is always `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.

| Column | Width | Rationale |
|--------|-------|-----------|
| ☐ (checkbox) | 40px | Fixed UI element |
| SCORE | 56px | 2-digit number |
| NAME | 180px | "Alexander Testfield" |
| COMPANY | 160px | "Testfield Ventures LLC" |
| TITLE | 140px | "Managing Partner" |
| EMAIL | 200px | email addresses |
| PHONE | 130px | "(555) 867-5309" |
| SOCIAL | 96px | 4–5 small icons |
| STATUS | 76px | "ACTIVE" badge |
| BIRTHDAY | 90px | "May 7, 1981" |
| ANNIVERSARY | 90px | "Jun 13, 2008" |
| SPOUSE | 140px | "Jordan Testfield" |
| CITY | 90px | "Austin" |
| HOMETOWN | 120px | "Austin, TX" |
| COLLEGE | 140px | "University of Texas" |
| HOBBIES | 180px | "Golf, woodworking..." clipped |
| CAR | 160px | "Tesla Model S..." clipped |
| CLUBS/ORGS | 180px | "Austin Country Club..." |
| RELIGION | 90px | "Catholic" |
| VACATION | 180px | "Annual ski trip..." clipped |
| FAV LUNCH | 120px | "Uchi" |
| FAV DINNER | 120px | "Fogo de Chão" |
| DRINKS? | 68px | "Yes" / "No" |
| (all remaining text fields) | 160px | default text column |
| (boolean fields) | 60px | "Yes" / "No" |

#### Implementation
- [ ] Use `<colgroup><col>` elements to set widths — CSS `width` on `col` is the correct approach for fixed-width table columns in HTML
- [ ] Table wrapper: `overflow-x: auto` with `width: 100%` — horizontal scroll when columns exceed viewport
- [ ] `table-layout: fixed` on the `<table>` element — this makes `col` widths authoritative
- [ ] Header cells: `position: sticky; top: 0; z-index: 10` — freeze header while body scrolls
- [ ] No `max-width` override on `td` — the column width IS the max width

#### Visual Polish
- [ ] Header cell background: `#09111F` (nearly black) — visually separates from body
- [ ] Alternating row backgrounds: odd rows `rgba(15,28,48,0.3)`, even rows transparent — subtle zebra striping
- [ ] Cell padding: `6px 10px` — enough breathing room without wasting space
- [ ] Font: 12px body cells (slightly smaller than current 13px to fit more columns)
- [ ] Score column: show as colored circle badge (green 70+, yellow 40-69, red <40)
- [ ] Boolean columns (Drinks?, Smokes?, etc.): show "Yes" in teal or "No" in muted, never "true"/"false"
- [ ] Date columns: formatted as "May 7, 1981" not raw ISO string

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(app)/dashboard/page.tsx` | Full layout fix — grid, KPI cards, panels |
| `src/components/contacts/ContactsTable.tsx` | Add `<colgroup>`, `table-layout:fixed`, cell borders, col widths, zebra striping |
| `src/app/globals.css` | Add `.rapport-table` cell border rule + table-layout:fixed |

---

## Acceptance Criteria

- [ ] Dashboard: open at 1280px wide — zero overflow, all 4 KPI cards fully visible with labels readable
- [ ] Dashboard: "Going Out Today" and "Coming Up" panels are same height, both have correct empty states
- [ ] Dashboard: "+ Add Contact" and "Load test data" buttons both visible in header, never wrapped
- [ ] Contacts: every cell has a visible border on all 4 sides
- [ ] Contacts: column widths match the spec table above
- [ ] Contacts: text always clips at column edge, never wraps to a second line
- [ ] Contacts: boolean values show "Yes"/"No" not "true"/"false"
- [ ] Contacts: dates formatted as "May 7, 1981" not "1981-05-07"
- [ ] Contacts: SCORE shows colored badge
- [ ] Contacts: header row is sticky
