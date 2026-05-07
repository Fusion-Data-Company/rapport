"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import ContactsTable from "@/components/contacts/ContactsTable"
import { GlassCard } from "@/components/ui/glass-card"
import { Users, Upload, Plus } from "lucide-react"

async function fetchContacts() {
  const res = await fetch("/api/contacts")
  if (!res.ok) throw new Error("Failed to fetch contacts")
  return res.json() as Promise<any[]>
}

async function updateContact(id: string, field: string, value: unknown) {
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: value }),
  })
  if (!res.ok) throw new Error("Failed to update contact")
  return res.json()
}

async function deleteContact(id: string) {
  const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete contact")
}

export default function ContactsPage() {
  const qc = useQueryClient()
  const { data: contacts = [], isLoading } = useQuery<any[]>({ queryKey: ["contacts"], queryFn: fetchContacts })

  const updateMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: unknown }) =>
      updateContact(id, field, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--surface-border)] shrink-0">
        <Users className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Contacts
          </h1>
          <p className="text-xs text-[var(--text-muted)]">McKay 66 relationship database</p>
        </div>
      </div>

      {/* Table fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <ContactsTable
          contacts={contacts}
          isLoading={isLoading}
          onUpdate={(id, field, value) => updateMutation.mutateAsync({ id, field, value })}
          onDelete={id => deleteMutation.mutateAsync(id)}
          onAdd={() => {/* TODO: open add contact dialog */}}
          onImport={() => window.location.href = "/contacts/import"}
        />
      </div>
    </div>
  )
}
