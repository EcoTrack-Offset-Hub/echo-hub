"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuthSession } from "@/lib/auth/AuthSessionProvider";
import { apiClient } from "@/lib/api/client";

type Change = { category: string; affectedPercent: string; reductionPercent: string };
type Result = { baselineRecords: unknown[]; baselineKg: string; projectedKg: string; savedKg: string; reductionPercent: string; recordCount: number; assumptions: string; categories: { category: string; baselineKg: string; projectedKg: string; savedKg: string }[] };
type Scenario = { id: string | null; name: string; reporting_period: string; changes: Change[]; results: Result };
const categories = ["Purchased Electricity", "Fleet & Fuel", "Facilities", "Business Travel", "Purchased Goods", "Logistics & Freight", "Other"];
const input = "border border-slate-300 rounded-lg p-2 bg-white w-full";
export default function ScenariosPage() {
  const { selectedCompanyId } = useAuthSession();
  const [name, setName] = useState("Reduction plan");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [changes, setChanges] = useState<Change[]>([{ category: categories[0], affectedPercent: "100", reductionPercent: "15" }]);
  const [result, setResult] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<Scenario[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const companyQuery = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : "";
  useEffect(() => {
    let live = true;
    apiClient<Scenario[]>(`/api/scenarios${companyQuery}`).then(rows => { if (live) setHistory(rows); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [companyQuery]);
  async function run(save: boolean) {
    setBusy(true); setError("");
    try {
      const response = await apiClient<Scenario>(`/api/scenarios${companyQuery}`, { method: "POST", body: JSON.stringify({ name, period, changes, save, expectedBaseline: save ? result?.results.baselineRecords : undefined }) });
      setResult(response);
      if (save) setHistory(await apiClient<Scenario[]>(`/api/scenarios${companyQuery}`));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to simulate"); }
    finally { setBusy(false); }
  }
  return <div><Header title="Scenario Simulation" subtitle="Compare a proposed plan with your saved emissions" />
    <main className="p-5 lg:p-8 space-y-6 max-w-6xl">
      <p className="text-sm text-slate-600">Model changes before making a decision. Replacing 30% of vehicles with vehicles that emit 80% less gives a 24% reduction in fleet emissions. Reducing all electricity consumption by 15% uses a 100% affected share and a 15% reduction.</p>
      {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}
      <form onSubmit={e => { e.preventDefault(); void run(false); }} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4"><label>Scenario name<input required maxLength={120} className={input} value={name} onChange={e => { setName(e.target.value); setResult(null); }} /></label><label>Baseline month<input required type="month" className={input} value={period} onChange={e => { setPeriod(e.target.value); setResult(null); }} /></label></div>
        {changes.map((change, i) => <div key={i} className="grid sm:grid-cols-4 gap-3 items-end">
          <label>Category<select className={input} value={change.category} onChange={e => { setChanges(changes.map((c, n) => n === i ? { ...c, category: e.target.value } : c)); setResult(null); }}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
          {(["affectedPercent", "reductionPercent"] as const).map(key => <label key={key}>{key === "affectedPercent" ? "Affected share (%)" : "Reduction within share (%)"}<input required type="number" min="0" max="100" step="0.01" className={input} value={change[key]} onChange={e => { setChanges(changes.map((c, n) => n === i ? { ...c, [key]: e.target.value } : c)); setResult(null); }} /></label>)}
          <button type="button" disabled={changes.length === 1} onClick={() => { setChanges(changes.filter((_, n) => n !== i)); setResult(null); }} className="p-2 border rounded-lg disabled:opacity-40">Remove</button>
        </div>)}
        <div className="flex flex-wrap gap-3"><button type="button" disabled={changes.length === 7} onClick={() => { setChanges([...changes, { category: categories.find(c => !changes.some(x => x.category === c))!, affectedPercent: "100", reductionPercent: "0" }]); setResult(null); }} className="border p-2 rounded-lg">Add category</button><button disabled={busy} className="bg-green-700 text-white p-2 rounded-lg">{busy ? "Calculating…" : "Preview scenario"}</button><button type="button" disabled={busy || !result || !!result.id} onClick={() => void run(true)} className="border p-2 rounded-lg disabled:opacity-40">{result?.id ? "Saved" : "Save scenario"}</button></div>
      </form>
      {result && <section className="bg-white border rounded-xl p-5 space-y-4"><h2 className="font-bold">{result.name} · {result.reporting_period}</h2>
        <div className="grid sm:grid-cols-3 gap-4">{[["Baseline", result.results.baselineKg], ["Projected", result.results.projectedKg], ["Savings", result.results.savedKg]].map(([label, value]) => <div key={label} className="bg-green-50 p-4 rounded-lg"><p>{label}</p><strong>{Number(value).toLocaleString(undefined, { maximumFractionDigits: 8 })} kg CO₂e</strong></div>)}</div>
        <p>{result.results.reductionPercent}% reduction from {result.results.recordCount} baseline activities.</p>
        <table className="w-full text-sm text-left"><thead><tr><th>Category</th><th>Baseline kg</th><th>Projected kg</th><th>Saved kg</th></tr></thead><tbody>{result.results.categories.map(c => <tr key={c.category} className="border-t"><td className="py-3">{c.category}</td><td>{c.baselineKg}</td><td>{c.projectedKg}</td><td>{c.savedKg}</td></tr>)}</tbody></table>
        <p className="text-xs text-slate-600">{result.results.assumptions}</p><p className="text-xs text-slate-600">Saved scenarios retain their baseline snapshot. Actual emissions and purchased offsets are unchanged.</p>
      </section>}
      <section className="space-y-3"><h2 className="font-bold">Saved scenarios</h2>{!history.length && <p>No saved scenarios yet.</p>}{history.map(s => <button key={s.id} className="block w-full text-left bg-white border rounded-lg p-4" onClick={() => { setResult(s); setName(s.name); setPeriod(s.reporting_period); setChanges(s.changes); }}>{s.name} · {s.reporting_period} · {s.results.reductionPercent}% reduction</button>)}</section>
    </main></div>;
}
