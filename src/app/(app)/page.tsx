"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, User } from "lucide-react";
import type { Customer } from "@/lib/types";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadCustomers() {
    const res = await fetch("/api/customers");
    const json = await res.json();
    setCustomers(json.customers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadCustomers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    });
    setName("");
    setContact("");
    setCreating(false);
    loadCustomers();
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-14">
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent mb-2">DRAPER SOCIETY</p>
        <h1 className="font-display text-4xl font-bold text-ink">Customers</h1>
      </header>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap gap-3 items-end mb-12 bg-surface border border-line rounded-2xl p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)]"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-muted mb-1.5" htmlFor="customer-name">
            Customer name
          </label>
          <input
            id="customer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
            placeholder="e.g. Priya Sharma"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label
            className="block text-xs font-semibold text-muted mb-1.5"
            htmlFor="customer-contact"
          >
            Contact (optional)
          </label>
          <input
            id="customer-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
            placeholder="phone / email"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="inline-flex items-center gap-1.5 min-h-11 bg-ink text-cream rounded-lg px-5 py-2.5 font-semibold cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          Add customer
        </button>
      </form>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading customers">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-line/40 animate-pulse"
              style={{ animationDuration: "1.4s" }}
            />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-2xl">
          <p className="text-muted">No customers yet — add one above to get started.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="group flex items-center gap-4 bg-surface border border-line rounded-2xl p-5 cursor-pointer transition-all hover:border-ink/30 hover:shadow-[0_8px_24px_-12px_rgba(28,25,23,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <span className="shrink-0 w-11 h-11 rounded-full bg-ink text-cream flex items-center justify-center font-display font-bold text-sm">
                  {initials(c.name) || <User size={18} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <p className="font-semibold text-ink truncate">{c.name}</p>
                  {c.contact && <p className="text-sm text-muted truncate">{c.contact}</p>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
