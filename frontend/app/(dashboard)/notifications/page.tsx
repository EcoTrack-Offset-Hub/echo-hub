"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { apiClient } from "@/lib/api/client";
type Notice = { key: string; title: string; detail: string; href: string; read: boolean };
export default function Notifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await apiClient<{ items: Notice[]; errors: Record<string,string> }>("/api/notifications");
      setItems(data.items); setError(Object.keys(data.errors).length ? "Some alert checks could not be loaded. Refresh to retry." : "");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load notifications"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function markRead(key: string) {
    try { await apiClient('/api/notifications/read', { method: 'POST', body: JSON.stringify({ key }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to mark as read"); }
  }
  return <><Header title="Notifications" subtitle="Current alerts and review reminders" /><main className="p-5 lg:p-8 max-w-5xl space-y-4">
    <p className="text-sm text-slate-600">Active alerts are updated from current records. Resolved conditions leave this list. Read status is saved for your account.</p>
    <button disabled={busy} onClick={() => void load()} className="border rounded-lg p-2">{busy ? "Loading…" : "Refresh"}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!busy && !error && !items.length && <p>No active notifications.</p>}
    {items.map(item => <article key={item.key} className={`bg-white border rounded-xl p-4 space-y-2 ${item.read ? "border-slate-200" : "border-green-600"}`}><h2 className="font-semibold">{!item.read && <span className="text-green-700 text-xs mr-2">Unread</span>}{item.title}</h2><p className="text-sm text-slate-600">{item.detail}</p><div className="flex gap-4 text-sm"><Link className="text-green-700 underline" href={item.href}>Review</Link>{!item.read && <button className="underline" onClick={() => void markRead(item.key)}>Mark as read</button>}</div></article>)}
  </main></>;
}
