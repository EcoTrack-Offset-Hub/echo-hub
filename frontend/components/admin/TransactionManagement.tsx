"use client";

import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { apiClient } from "@/lib/api/client";
import { Modal } from "@/components/ui/Modal";

type Row = Record<string, string | number | boolean | null>;
type Detail = Row & { retirements?: never };
type Retirement = { id: string; quantity: string; registry_reference: string; created_at: string };
type Evidence = { transaction: Detail; retirements: Retirement[] };
const amount = (value: Row[string]) => new Decimal(String(value ?? 0));
const remaining = (row: Row) => amount(row.credits_tco2e).minus(amount(row.retired));
const fmt = (value: Decimal) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const control = "block w-full mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm";

export function TransactionManagement({ rows, loading, saving, errorMessage, onSave }: { rows: Row[]; loading: boolean; saving: boolean; errorMessage: string; onSave: (path: string, body: unknown, method?: string) => Promise<boolean> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [dialog, setDialog] = useState<{ row: Row; mode: "View" | "Retire" } | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [detailError, setDetailError] = useState("");
  const [retry, setRetry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const completed = rows.filter(row => row.status === "Completed");
  const purchased = completed.reduce((sum, row) => sum.plus(amount(row.credits_tco2e)), new Decimal(0));
  const retired = completed.reduce((sum, row) => sum.plus(amount(row.retired)), new Decimal(0));
  const visible = rows.filter(row => [row.transaction_id, row.company, row.project].join(" ").toLowerCase().includes(search.toLowerCase()) && (filter === "All" || (filter === "Remaining credits" ? row.status === "Completed" && remaining(row).gt(0) : row.status === "Completed" && remaining(row).eq(0))));
  useEffect(() => {
    if (!dialog) return;
    let live = true;
    apiClient<Evidence>(`/api/admin/transactions/${dialog.row.id}`).then(data => { if (live) { setEvidence(data); setDetailError(""); } }).catch(error => { if (live) setDetailError(error.message); });
    return () => { live = false; };
  }, [dialog, retry]);
  function open(row: Row, mode: "View" | "Retire") { setEvidence(null); setDetailError(""); setAttempted(false); setDialog({ row, mode }); }
  const selected = evidence?.transaction || dialog?.row;
  const badge = (row: Row) => <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "Completed" ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{row.status}</span>;
  return <>
    <div><h2 className="text-lg font-semibold">Transactions</h2><p className="text-xs text-slate-500 mt-1">Review purchases and record registry retirement evidence. Purchases and retirements are separate records.</p></div>
    <div className="grid sm:grid-cols-3 gap-3">{[["Purchased", purchased], ["Documented retirement", retired], ["Remaining to retire", purchased.minus(retired)]].map(([label, total]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{String(label)}</p><p className="mt-1 text-xl font-bold tabular-nums">{fmt(total as Decimal)} <span className="text-xs font-normal text-slate-500">tCO₂e</span></p><p className="text-xs text-slate-400 mt-1">Completed purchases on this page</p></div>)}</div>
    <div className="flex flex-wrap items-end gap-3"><label className="flex-1 min-w-48 text-xs text-slate-600">Search this page<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Transaction, company or project" className={control} /></label><label className="text-xs text-slate-600">Retirement status<select value={filter} onChange={e => setFilter(e.target.value)} className={control}>{["All", "Remaining credits", "Fully retired"].map(value => <option key={value}>{value}</option>)}</select></label><span className="text-xs text-slate-500 pb-3">{visible.length} of {rows.length} records on this page</span></div>
    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{["Transaction / Company", "Project", "Purchased (tCO₂e)", "Retired (tCO₂e)", "Remaining (tCO₂e)", "Status", "Actions"].map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={String(row.id)} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="p-4"><p className="font-semibold whitespace-nowrap">{row.transaction_id}</p><p className="text-xs text-slate-500 mt-1">{row.company}</p></td><td className="p-4">{row.project}</td><td className="p-4 tabular-nums">{fmt(amount(row.credits_tco2e))}</td><td className="p-4 tabular-nums">{fmt(amount(row.retired))}</td><td className="p-4 tabular-nums">{row.status === "Completed" ? fmt(remaining(row)) : "Not eligible"}</td><td className="p-4">{badge(row)}</td><td className="p-4"><div className="flex gap-2"><button onClick={() => open(row, "View")} className="border rounded-lg px-3 py-2 text-xs text-green-800">View</button><button disabled={saving || row.status !== "Completed" || remaining(row).lte(0)} onClick={() => open(row, "Retire")} className="border rounded-lg px-3 py-2 text-xs text-green-800 disabled:opacity-40 whitespace-nowrap">Record retirement</button></div></td></tr>)}</tbody></table>{!loading && !visible.length && <p className="p-6 text-sm text-slate-500">{rows.length ? "No transactions match your filters on this page." : "No transactions found."}</p>}</div>
    {dialog && selected && <Modal isOpen onClose={() => { if (!saving) setDialog(null); }} title={dialog.mode === "View" ? "Transaction details" : "Record retirement evidence"} subtitle={String(selected.transaction_id)} maxWidth="2xl" footer={<div className="flex justify-end gap-3"><button disabled={saving} onClick={() => setDialog(null)} className="border rounded-lg px-4 py-2 text-sm">{dialog.mode === "View" ? "Close" : "Cancel"}</button>{dialog.mode === "Retire" && <button type="submit" form="record-retirement" disabled={saving || !evidence || !!detailError || selected.status !== "Completed" || remaining(selected).lte(0)} className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40">{saving ? "Recording..." : "Record retirement"}</button>}</div>}>
      <dl className="grid sm:grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-slate-500">Company</dt><dd className="mt-1 font-semibold">{selected.company}</dd></div><div><dt className="text-xs text-slate-500">Project</dt><dd className="mt-1">{selected.project}</dd></div><div><dt className="text-xs text-slate-500">Purchase status</dt><dd className="mt-1">{badge(selected)}</dd></div>{selected.created_at && <div><dt className="text-xs text-slate-500">Purchased on</dt><dd className="mt-1">{new Date(String(selected.created_at)).toLocaleString()}</dd></div>}</dl>
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 mt-5 text-xs">{[["Purchased", amount(selected.credits_tco2e)], ["Retired", amount(selected.retired)], ["Remaining", remaining(selected)]].map(([label, total]) => <div key={String(label)}><p className="text-slate-500">{String(label)} (tCO₂e)</p><p className="font-semibold text-sm mt-1 tabular-nums">{fmt(total as Decimal)}</p></div>)}</div>
      {!evidence && !detailError && <p role="status" className="mt-4 text-sm text-slate-500">Loading current balances and evidence...</p>}
      {detailError && <p role="alert" className="mt-4 text-sm text-red-700">{detailError} <button className="underline" onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
      {attempted && errorMessage && <p role="alert" className="mt-4 text-sm text-red-700">{errorMessage}</p>}
      {dialog.mode === "Retire" ? <form id="record-retirement" className="mt-5 space-y-4" onSubmit={async event => {
        event.preventDefault(); setAttempted(true);
        const form = new FormData(event.currentTarget);
        if (await onSave(`/api/admin/transactions/${selected.id}/retire`, { quantity: form.get("quantity"), reference: form.get("reference") })) setDialog(null);
      }}><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This records evidence of retirement already performed in a registry. It does not retire credits with that registry. Saved evidence is append-only.</p><label className="block text-xs text-slate-600">Quantity retired (tCO₂e)<input className={control} name="quantity" type="number" min="0.01" step="0.01" max={remaining(selected).toFixed(2)} required disabled={saving} /></label><label className="block text-xs text-slate-600">Registry retirement reference<input className={control} name="reference" required maxLength={255} disabled={saving} /></label></form> : <section className="mt-5"><h3 className="text-sm font-semibold">Retirement evidence</h3>{evidence && (!evidence.retirements.length ? <p className="mt-3 text-sm text-slate-500">No retirement evidence recorded.</p> : <ol className="space-y-3 mt-3">{evidence.retirements.map(entry => <li key={entry.id} className="border rounded-lg p-3 text-sm"><p className="font-semibold">{fmt(new Decimal(entry.quantity))} tCO₂e</p><p className="mt-1 break-words">Registry reference: {entry.registry_reference}</p><time className="block text-xs text-slate-500 mt-1">{new Date(entry.created_at).toLocaleString()}</time></li>)}</ol>)}</section>}
    </Modal>}
  </>;
}
