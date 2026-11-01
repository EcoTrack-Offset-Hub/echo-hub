"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
type Review = { id: string; decision: string; comment: string; created_at: string; reviewer_id: string };
type Row = { calculation_details?: { source?: string; assumptions?: string; factorVersionId?: number }; conversion_factor?: string; id: string; company_name: string; activity: string; reporting_period: string; formula: string; methodology: string; status: string; revision: string; raw_input: string; input_unit: string; result_tonnes: string; reviews: Review[] };
export function EmissionReview({ recordId, onSaved }: { recordId: string; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    const record = recordId;
    apiClient<{ rows: Row[]; total: number }>(`/api/admin/reviews?${new URLSearchParams({ page: "1", ...(record ? { record } : {}) })}`).then(data => { if (live) { setRows(data.rows); setLoading(false); setError(""); } }).catch(e => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [refresh, recordId]);
  async function review(row: Row, form: FormData) {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiClient(`/api/admin/reviews/${encodeURIComponent(row.id)}`, { method: 'POST', body: JSON.stringify({ decision: form.get('decision'), comment: form.get('comment'), revision: row.revision }) });
      setNotice('Review saved. Later company edits will require a new review.'); setRefresh(n => n+1); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save review"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    {error && <p role="alert" className="text-red-700">{error} <button className="underline" onClick={() => setRefresh(n => n+1)}>Reload</button></p>}{notice && <p role="status" className="text-green-700">{notice}</p>}
    {rows.map(row => <section key={row.id + row.revision} className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold">{row.company_name} — {row.activity}</h2><p className="text-sm">{row.reporting_period} · {row.status} · {row.result_tonnes} tCO₂e</p><p className="text-sm">Original input: {row.raw_input} {row.input_unit}</p><p className="text-sm font-mono break-words">{row.formula || 'Formula not recorded'}</p><p className="text-sm">{row.methodology || 'Methodology not recorded'}</p><p className="text-sm">Factor: {row.conversion_factor || 'Not recorded'} ? Version: {row.calculation_details?.factorVersionId || 'Not recorded'}</p><p className="text-sm">Source: {row.calculation_details?.source || 'Not recorded'}</p><p className="text-sm">Assumptions: {row.calculation_details?.assumptions || 'Not recorded'}</p>
      <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); void review(row, new FormData(e.currentTarget)); }}><select name="decision" className="border p-2 rounded" aria-label="Review decision"><option>Comment</option><option>Approved</option><option>Rejected</option></select><textarea name="comment" required minLength={3} maxLength={4000} aria-label="Review evidence and comments" placeholder="Explain your decision and evidence" className="border rounded p-2 flex-1 min-w-60" /><button disabled={busy} className="bg-green-700 text-white rounded px-4 py-2">Save review</button></form>
      <details><summary className="cursor-pointer text-sm">Review history ({row.reviews.length})</summary>{row.reviews.map(r => <div key={r.id} className="border-t py-3 text-sm"><strong>{r.decision}</strong> · {new Date(r.created_at).toLocaleString()} · Reviewer {r.reviewer_id}<p>{r.comment}</p></div>)}</details>
    </section>)}
    {loading && <p role="status">Loading record and review history?</p>}
    {!loading && !rows.length && !error && <p>No record found.</p>}
  </div>;
}
