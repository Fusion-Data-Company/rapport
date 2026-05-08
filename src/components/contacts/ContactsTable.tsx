"use client"
import { useState, useMemo, useCallback, useRef } from "react"
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState, type VisibilityState,
  type ColumnFiltersState, type PaginationState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Plus, Upload, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Eye,
  Mail, Phone, Building, User, MapPin,
} from "lucide-react"
import { FacebookIcon, LinkedInIcon, InstagramIcon, TikTokIcon, XIcon, MapPinIcon, SocialIconCell } from "@/components/ui/social-icons"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import ContactSlidePanel from "./ContactSlidePanel"
import { cn, getInitials, formatDate } from "@/lib/utils"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Contact = Record<string, any>

// ── Helpers ───────────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "7px 10px", boxSizing: "border-box", position: "relative",
  whiteSpace: "nowrap", fontSize: "10px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  color: "rgba(100,116,139,0.9)",
  border: "1px solid rgba(43,168,162,0.18)",
  background: "rgba(9,17,31,0.95)",
}
const TD: React.CSSProperties = {
  padding: "6px 10px", boxSizing: "border-box", verticalAlign: "middle",
  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
  fontSize: "12px", fontWeight: 500,
  color: "rgba(226,232,240,0.85)",
  border: "1px solid rgba(43,168,162,0.10)",
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "var(--teal)" : score >= 40 ? "var(--gold)" : "var(--coral)"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-teal", inactive: "badge-gray", do_not_contact: "badge-coral"
  }
  return <span className={cn("badge", map[status] ?? "badge-gray")}>{status.replace("_", " ")}</span>
}

// ── Column Definitions ────────────────────────────────────────────────────────

function buildColumns(onUpdate: (id: string, field: string, value: unknown) => void): ColumnDef<Contact>[] {
  return [
    // Checkbox
    {
      id: "select",
      size: 40,
      enableSorting: false,
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-3.5 h-3.5 accent-[var(--teal)] cursor-pointer" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 accent-[var(--teal)] cursor-pointer" />
      ),
    },

    // Score
    {
      id: "score", accessorKey: "enrichmentScore", size: 88,
      header: "Score",
      cell: ({ getValue }) => <ScoreBadge score={(getValue() as number) ?? 0} />,
    },

    // Name
    {
      id: "name", size: 180,
      header: "Name",
      accessorFn: row => `${row.firstName} ${row.lastName ?? ""}`.trim(),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))" }}>
            {getInitials(row.original.firstName, row.original.lastName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-[13px]">
              {row.original.firstName} {row.original.lastName ?? ""}
            </p>
            {row.original.nickname && (
              <p className="text-[11px] text-[var(--text-muted)] truncate">&ldquo;{row.original.nickname}&rdquo;</p>
            )}
          </div>
        </div>
      ),
    },

    // Company
    {
      id: "company", accessorKey: "companyName", size: 160,
      header: "Company",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Building className="w-3 h-3 shrink-0 opacity-50" />
          {(getValue() as string) ?? "—"}
        </span>
      ),
    },

    // Title
    { id: "title", accessorKey: "jobTitle", size: 140, header: "Title" },

    // Email
    {
      id: "email", accessorKey: "email", size: 190,
      header: "Email",
      cell: ({ getValue }) => {
        const v = getValue() as string
        return v ? (
          <a href={`mailto:${v}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[var(--teal-light)] hover:underline" title={v}>
            <Mail className="w-3 h-3 shrink-0" />{v}
          </a>
        ) : "—"
      },
    },

    // Phone
    {
      id: "phone", accessorKey: "phone", size: 130,
      header: "Phone",
      cell: ({ getValue }) => {
        const v = getValue() as string
        return v ? (
          <a href={`tel:${v}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[var(--sky)] hover:underline">
            <Phone className="w-3 h-3 shrink-0" />{v}
          </a>
        ) : "—"
      },
    },

    // Social Media (all 5 icons in one column)
    {
      id: "social", size: 100, enableSorting: false,
      header: "Social",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <SocialIconCell icon="facebook" url={row.original.facebookUrl} size={22}
            onAdd={url => onUpdate(row.original.id, "facebookUrl", url)} />
          <SocialIconCell icon="linkedin" url={row.original.linkedinUrl} size={22}
            onAdd={url => onUpdate(row.original.id, "linkedinUrl", url)} />
          <SocialIconCell icon="instagram" url={row.original.instagramUrl} size={22}
            onAdd={url => onUpdate(row.original.id, "instagramUrl", url)} />
          <SocialIconCell icon="tiktok" url={row.original.tiktokUrl} size={22}
            onAdd={url => onUpdate(row.original.id, "tiktokUrl", url)} />
          <SocialIconCell icon="x" url={row.original.twitterUrl} size={22}
            onAdd={url => onUpdate(row.original.id, "twitterUrl", url)} />
        </div>
      ),
    },

    // Map / Location
    {
      id: "location", size: 52, enableSorting: false,
      header: () => <MapPin className="w-3 h-3" />,
      cell: ({ row }) => {
        const hasAddr = !!(row.original.city || row.original.geocodedAddress)
        return (
          <button
            onClick={e => {
              e.stopPropagation()
              if (hasAddr && row.original.latitude && row.original.longitude) {
                window.open(`https://maps.google.com/?q=${row.original.latitude},${row.original.longitude}`, "_blank")
              } else {
                onUpdate(row.original.id, "_promptAddress", true)
              }
            }}
            title={hasAddr ? row.original.geocodedAddress ?? row.original.city ?? "View map" : "Add address"}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-slate-800/60 transition-colors"
          >
            <MapPinIcon size={20} hasData={hasAddr} />
          </button>
        )
      },
    },

    // Status
    { id: "status", accessorKey: "status", size: 80, header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },

    // Birthday
    {
      id: "birthday", accessorKey: "birthdate", size: 96, header: "Birthday",
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        if (!v) return <span style={{color:"rgba(100,116,139,0.5)"}}>—</span>
        const d = new Date(v + "T12:00:00")
        return <span>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      },
    },

    // Anniversary
    {
      id: "anniversary", accessorKey: "anniversary", size: 96, header: "Anniversary",
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        if (!v) return <span style={{color:"rgba(100,116,139,0.5)"}}>—</span>
        const d = new Date(v + "T12:00:00")
        return <span>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      },
    },

    // Spouse
    { id: "spouse", accessorKey: "spouseName", size: 140, header: "Spouse" },

    // City
    { id: "city", accessorKey: "city", size: 90, header: "City" },

    // Hometown
    { id: "hometown", accessorKey: "placeHometown", size: 120, header: "Hometown" },

    // College
    { id: "college", accessorKey: "college", size: 140, header: "College" },

    // Hobbies
    { id: "hobbies", accessorKey: "hobbies", size: 180, header: "Hobbies" },

    // Car
    { id: "car", accessorKey: "carType", size: 160, header: "Car" },

    // Clubs
    { id: "clubs", accessorKey: "clubs", size: 180, header: "Clubs / Orgs" },

    // Religion
    { id: "religion", accessorKey: "religion", size: 96, header: "Religion" },

    // Hobbies / Vacation
    { id: "vacation", accessorKey: "vacationHabits", size: 180, header: "Vacation Style" },

    // Fav Lunch
    { id: "lunch", accessorKey: "favoriteLunchRestaurant", size: 120, header: "Fav Lunch Spot" },

    // Fav Dinner
    { id: "dinner", accessorKey: "favoriteDinnerRestaurant", size: 120, header: "Fav Dinner Spot" },

    // Drink
    {
      id: "drinks", accessorKey: "drinks", size: 68, header: "Drinks?",
      cell: ({ getValue }) => {
        const v = getValue() as boolean | null
        if (v === null || v === undefined) return <span style={{color:"rgba(100,116,139,0.5)"}}>—</span>
        return <span style={{color: v ? "var(--teal)" : "rgba(100,116,139,0.7)", fontWeight:600}}>{v ? "Yes" : "No"}</span>
      },
    },

    // McKay 66 Section: Business background
    { id: "businessObjective", accessorKey: "businessObjectiveLongRange", size: 200, header: "Long-Range Business Goal" },
    { id: "businessImmediate", accessorKey: "businessObjectiveImmediate", size: 200, header: "Immediate Business Goal" },
    { id: "greatestConcern", accessorKey: "greatestConcern", size: 200, header: "Greatest Concern" },
    { id: "professionalAssoc", accessorKey: "professionalAssociations", size: 180, header: "Prof. Associations" },
    { id: "officesHeld", accessorKey: "officesHeld", size: 160, header: "Offices / Honors" },
    { id: "statusSymbols", accessorKey: "statusSymbols", size: 160, header: "Status Symbols" },
    { id: "prevEmployer1", accessorKey: "previousEmployer1", size: 160, header: "Prev. Employer" },

    // McKay 66: Education
    { id: "highSchool", accessorKey: "highSchool", size: 140, header: "High School" },
    { id: "degrees", accessorKey: "degrees", size: 130, header: "Degrees" },
    { id: "collegeFraternity", accessorKey: "collegeFraternity", size: 150, header: "Fraternity / Sorority" },
    { id: "collegeSports", accessorKey: "collegeSports", size: 140, header: "College Sports" },
    { id: "military", accessorKey: "militaryService", size: 130, header: "Military" },
    { id: "militaryRank", accessorKey: "militaryRank", size: 120, header: "Mil. Rank" },

    // McKay 66: Family
    { id: "spouseOccupation", accessorKey: "spouseOccupation", size: 150, header: "Spouse Occupation" },
    { id: "spouseEducation", accessorKey: "spouseEducation", size: 150, header: "Spouse Education" },
    { id: "spouseInterests", accessorKey: "spouseInterests", size: 160, header: "Spouse Interests" },

    // McKay 66: Lifestyle / Personal
    { id: "medicalHistory", accessorKey: "medicalHistory", size: 180, header: "Health Notes" },
    { id: "drinkType", accessorKey: "drinkType", size: 130, header: "Drink Preference" },
    { id: "favoriteMenuItems", accessorKey: "favoriteMenuItems", size: 180, header: "Fav. Menu Items" },
    { id: "conversationalInterests", accessorKey: "conversationalInterests", size: 200, header: "Conversational Interests" },
    { id: "adjectives", accessorKey: "adjectives", size: 180, header: "Adjectives" },
    { id: "proudestAchievement", accessorKey: "proudestAchievement", size: 200, header: "Proudest Achievement" },
    { id: "personalObjective", accessorKey: "personalObjectiveLongRange", size: 200, header: "Personal Long-Range Goal" },
    { id: "personalImmediate", accessorKey: "personalObjectiveImmediate", size: 200, header: "Personal Immediate Goal" },

    // McKay 66: Politics / Community
    { id: "politicalParty", accessorKey: "politicalParty", size: 120, header: "Political Party" },
    { id: "communityActive", accessorKey: "communityActive", size: 180, header: "Community Activity" },

    // McKay 66: Sensitive/Notes
    { id: "strongFeelings", accessorKey: "strongFeelings", size: 200, header: "Strong Feelings On" },
    { id: "internalNotes", accessorKey: "internalNotes", size: 220, header: "Internal Notes" },

    // Tags
    {
      id: "tags", accessorKey: "tags", size: 180, header: "Tags", enableSorting: false,
      cell: ({ getValue }) => {
        const tags = (getValue() as string[]) ?? []
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(t => (
              <span key={t} className="badge badge-teal text-[10px] py-0.5 px-2">{t}</span>
            ))}
            {tags.length > 3 && <span className="badge badge-gray text-[10px]">+{tags.length - 3}</span>}
          </div>
        )
      },
    },

    // Created At
    { id: "createdAt", accessorKey: "createdAt", size: 120, header: "Added", cell: ({ getValue }) => formatDate(getValue() as string) },
  ]
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  contacts: Contact[]
  onUpdate: (id: string, field: string, value: unknown) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: () => void
  onImport: () => void
  isLoading?: boolean
}

export default function ContactsTable({ contacts, onUpdate, onDelete, onAdd, onImport, isLoading }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 100 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const handleUpdate = useCallback(async (id: string, field: string, value: unknown) => {
    await onUpdate(id, field, value)
  }, [onUpdate])

  const columns = useMemo(() => buildColumns(handleUpdate), [handleUpdate])

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  })

  const selectedContact = selectedId ? contacts.find(c => c.id === selectedId) ?? null : null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--surface-border)] shrink-0"
        style={{ background: "rgba(9,17,31,0.95)" }}>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search contacts…"
            className="input-premium pl-9 py-2 text-sm"
          />
        </div>

        {/* Stats */}
        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
          {table.getFilteredRowModel().rows.length.toLocaleString()} contacts
        </span>

        {Object.keys(rowSelection).length > 0 && (
          <span className="badge badge-teal">
            {Object.keys(rowSelection).length} selected
          </span>
        )}

        <div className="flex-1" />

        {/* Column toggle */}
        <div className="relative group">
          <button className="btn-ghost btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Columns
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 glass-card p-2 z-50 hidden group-focus-within:block">
            {table.getAllLeafColumns().filter(c => c.id !== "select").map(col => (
              <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:text-white rounded">
                <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()}
                  className="accent-[var(--teal)]" />
                {String(col.columnDef.header ?? col.id)}
              </label>
            ))}
          </div>
        </div>

        <GlassButton variant="ghost" size="sm" onClick={onImport}>
          <Upload className="w-3.5 h-3.5" /> Import
        </GlassButton>
        <GlassButton size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Contact
        </GlassButton>
      </div>

      {/* Table wrapper */}
      <div className="flex flex-1 overflow-hidden relative">
        <div ref={parentRef} className="flex-1 overflow-auto">
          <table className="rapport-table" style={{ width: table.getTotalSize(), tableLayout: "fixed" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} style={{ ...TH, width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ChevronUp className="w-3 h-3 ml-auto text-[var(--teal)]" />}
                        {header.column.getIsSorted() === "desc" && <ChevronDown className="w-3 h-3 ml-auto text-[var(--teal)]" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map(vi => {
                const row = rows[vi.index]
                return (
                  <motion.tr
                    key={row.id}
                    data-index={vi.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ transform: `translateY(${vi.start}px)`, position: "absolute", width: "100%", display: "table-row", background: vi.index % 2 === 0 ? "rgba(15,28,48,0.25)" : "transparent" }}
                    className={cn(
                      "cursor-pointer",
                      row.getIsSelected() && "selected",
                      selectedId === row.original.id && "bg-[rgba(43,168,162,0.08)]"
                    )}
                    onClick={() => setSelectedId(prev => prev === row.original.id ? null : row.original.id)}
                    initial={false}
                    whileHover={{ backgroundColor: "rgba(43,168,162,0.04)" }}
                    transition={{ duration: 0.1 }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ ...TD, width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {isLoading && (
            <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
              <div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <User className="w-10 h-10 text-[var(--text-muted)]" />
              <p className="text-[var(--text-muted)]">No contacts yet — import a CSV or talk to Paige</p>
              <GlassButton size="sm" onClick={onImport}><Upload className="w-3.5 h-3.5" /> Import CSV</GlassButton>
            </div>
          )}
        </div>

        {/* Slide-out panel */}
        <AnimatePresence>
          {selectedContact && (
            <ContactSlidePanel
              contact={selectedContact}
              onClose={() => setSelectedId(null)}
              onUpdate={handleUpdate}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--surface-border)] shrink-0"
        style={{ background: "rgba(9,17,31,0.95)" }}>
        <span className="text-[11px] text-[var(--text-muted)]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {contacts.length.toLocaleString()} total
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-[var(--text-muted)]">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-[var(--text-muted)]">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-[var(--text-muted)]">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-[var(--text-muted)]">
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className="text-[11px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[var(--text-muted)]"
        >
          {[50, 100, 250, 500].map(n => <option key={n} value={n}>Show {n}</option>)}
        </select>
      </div>
    </div>
  )
}
