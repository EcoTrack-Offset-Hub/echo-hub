"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Factor = Record<string, string | number | boolean | null>;
const value = (row: Factor, key: string) => String(row[key] ?? "");
// Keep decimal strings exact; remove padding without converting through floating point.
const number = (raw: Factor[string]) => String(raw ?? "").replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
const day = (raw: Factor[string]) => raw ? String(raw).slice(0, 10) : "";
const date = (raw: Factor[string]) => raw ? new Date(day(raw) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Not configured";
const control = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800";

export function FactorManagement({ rows, loading, onAdd }: { rows: Factor[]; loading: boolean; onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("All");
  const [status, setStatus] = useState("All");
  const [review, setReview] = useState("All");
  const [allVersions, setAllVersions] = useState(false);
  const [selected, setSelected] = useState<Factor | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (row: Factor) => !!row.active && !!row.review_due && day(row.review_due) < today;
  const categories = [...new Set(rows.map(row => value(row, "category")))].sort();
  const versions = (category: string) => rows.filter(row => row.category === category).sort((a, b) => value(b, "created_at").localeCompare(value(a, "created_at")) || Number(b.id) - Number(a.id));
  const current = categories.map(category => { const list = versions(category); return list.find(row => row.active) || list[0]; });
  const filtered = (allVersions ? rows : current).filter(row => value(row, "category").toLowerCase().includes(search.toLowerCase()) && (scope === "All" || row.default_scope === scope) && (status === "All" || !!row.active === (status === "Active")) && (review === "All" || (review === "Overdue" ? overdue(row) : !row.review_due)));
  const badge = (row: Factor) => <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${row.active ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{row.active ? "Active" : "Inactive"}</span>;
  const reviewDate = (row: Factor) => <><span>{date(row.review_due)}</span>{overdue(row) && <span className="block text-xs font-medium text-amber-800 mt-1">Review overdue</span>}</>;

  return <>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[["Categories", categories.length], ["Active versions", rows.filter(row => row.active).length], ["Reviews overdue", rows.filter(overdue).length]].map(([label, count]) => <div key={label} className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold mt-1">{count}</p></div>)}
    </div>
    <p className="text-xs text-slate-500">Active versions are used for new calculations. Publishing a replacement preserves saved results. Source information is administrator supplied; Active does not mean independently verified.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-48 text-xs text-slate-600">Search category<input type="search" placeholder="e.g. Purchased Electricity" value={search} onChange={e => setSearch(e.target.value)} className={control} /></label>
      <label className="text-xs text-slate-600">Scope<select value={scope} onChange={e => setScope(e.target.value)} className={control}>{["All", "Scope 1", "Scope 2", "Scope 3"].map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-slate-600">Status<select value={status} onChange={e => setStatus(e.target.value)} className={control}>{["All", "Active", "Inactive"].map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-slate-600">Review<select value={review} onChange={e => setReview(e.target.value)} className={control}>{["All", "Overdue", "No date"].map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500"><span>{filtered.length} {allVersions ? "versions" : "categories"} shown</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allVersions} onChange={e => setAllVersions(e.target.checked)} />Show all versions</label></div>
    {!allVersions && <p className="text-xs text-slate-500">Showing the active version in each category, or the newest saved version if none is active. Use History or Show all versions to inspect older entries.</p>}
    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{["Category", "Factor and unit", "Scope", "Status", "Review due", "Actions"].map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody>
      {filtered.map(row => <tr key={value(row, "id")} className="border-t border-slate-100 hover:bg-slate-50/60">
        <td className="p-4"><p className="font-semibold">{row.category}</p><p className="mt-1 text-xs text-slate-500">Version #{row.id} · {versions(value(row, "category")).length} saved versions</p></td>
        <td className="p-4"><p className="font-semibold tabular-nums">{number(row.factor)}</p><p className="mt-1 text-xs text-slate-500 whitespace-nowrap">{row.unit}</p></td>
        <td className="p-4 whitespace-nowrap">{row.default_scope}</td><td className="p-4">{badge(row)}</td><td className="p-4 whitespace-nowrap">{reviewDate(row)}</td>
        <td className="p-4"><div className="flex gap-2"><button onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-green-800" aria-label={`View ${row.category} version ${row.id}`}>View</button><button onClick={() => setHistory(value(row, "category"))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-green-800" aria-label={`History for ${row.category}`}>History</button></div></td>
      </tr>)}
    </tbody></table>{!loading && !filtered.length && <div className="p-6 text-sm text-slate-500">{rows.length ? "No factors match your filters." : "No factor versions yet."}<button onClick={() => { setSearch(""); setScope("All"); setStatus("All"); setReview("All"); }} className="ml-2 text-green-700 underline">Reset filters</button></div>}</div>
    {selected && <Modal isOpen onClose={() => setSelected(null)} title={value(selected, "category")} subtitle={`Factor version #${selected.id}`} maxWidth="2xl" footer={<div className="flex justify-end gap-3"><button onClick={() => setSelected(null)} className="border rounded-lg px-4 py-2 text-sm">Close</button><button onClick={() => { setSelected(null); onAdd(); }} className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm">Add Factor Version</button></div>}>
      <div className="rounded-xl bg-green-50 p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-2xl font-bold tabular-nums">{number(selected.factor)}</p><p className="text-sm text-slate-600 mt-1">{selected.unit}</p></div>{badge(selected)}</div>
      <dl className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">{[["Scope", value(selected, "default_scope")], ["Review due", date(selected.review_due)], ["Created", new Date(value(selected, "created_at")).toLocaleString()], ["Exact stored factor", value(selected, "factor")]].map(([label, content]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words">{content}</dd></div>)}</dl>
      {overdue(selected) && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">The configured review date has passed. A review date is a scheduling field, not evidence that a technical review occurred.</p>}
      <dl className="space-y-4 mt-5 text-sm">{[["Source / publication", "source_reference"], ["Methodology", "methodology"], ["Standard", "standard"], ["Applicability and assumptions", "assumptions"]].map(([label, key]) => <div key={key}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-600">{value(selected, key) || "Not recorded — verify before relying on this factor for reporting."}</dd></div>)}</dl>
    </Modal>}
    {history && <Modal isOpen onClose={() => setHistory(null)} title="Factor version history" subtitle={history} maxWidth="2xl" footer={<div className="flex justify-end"><button onClick={() => setHistory(null)} className="border rounded-lg px-4 py-2 text-sm">Close</button></div>}>
      <p className="text-sm text-slate-600 mb-4">Newest first. Existing emissions retain the factor version used when they were saved.</p>
      <ol className="space-y-3">{versions(history).map(row => <li key={value(row, "id")} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{number(row.factor)} <span className="text-xs font-normal text-slate-500">{row.unit}</span></p><p className="text-xs text-slate-500 mt-1">Version #{row.id} · {new Date(value(row, "created_at")).toLocaleString()}</p></div>{badge(row)}</div><p className="text-sm text-slate-600 mt-3 break-words">Source: {value(row, "source_reference") || "Not recorded"}</p><button onClick={() => { setHistory(null); setSelected(row); }} className="mt-3 text-sm text-green-700 underline">View calculation evidence</button></li>)}</ol>
    </Modal>}
  </>;
}
