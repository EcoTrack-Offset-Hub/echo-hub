import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, ChevronRight } from "lucide-react";
import type { AdminData } from "@/lib/api/admin";

export function CompanyEmissionsAlerts({ month, alerts }: { month: string; alerts: NonNullable<AdminData["thresholdAlerts"]> }) {
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const exceeded = alerts.filter(alert => alert.status === "exceeded").length;
  const sorted = [...alerts].sort((a, b) => Number(b.percent) - Number(a.percent));
  return <section className="bg-white border border-[#e4eae7] rounded-xl shadow-xs overflow-hidden min-w-0 h-full flex flex-col">
    <div className="p-4 md:p-5 pb-3 border-b border-slate-100">
      <div className="space-y-2">
        <h3 className="font-bold text-sm flex items-center gap-2"><Bell size={17} className="text-green-700" />Company Emissions Alerts</h3>
        <Link href="/companies" className="inline-block text-xs font-semibold text-green-700 hover:underline">Manage Limits</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">{monthLabel}</span>
        <span className="text-slate-500">Monthly emissions before offsets</span>
      </div>
    </div>
    <div className="p-4 md:p-5 flex-1 flex flex-col">
      {alerts.length ? <>
        <p className="text-xs text-slate-600 mb-4"><strong>{alerts.length}</strong> {alerts.length === 1 ? "company needs" : "companies need"} attention · {exceeded} at or above the limit</p>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {sorted.map(alert => {
            const isExceeded = alert.status === "exceeded";
            const width = Math.min(100, Math.max(0, Number(alert.percent)));
            return <div key={alert.id} className={`rounded-xl border p-3 ${isExceeded ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{alert.name}</p>
                <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${isExceeded ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}><AlertTriangle size={12} />{isExceeded ? "Limit reached or exceeded" : "Approaching limit"}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs mt-3 mb-2"><span className="text-slate-600">{alert.emissions} / {alert.limit} tCO₂e</span><strong className={isExceeded ? "text-red-800" : "text-amber-800"}>{alert.percent}% of limit</strong></div>
              <div role="meter" aria-label={`${alert.name} monthly emissions limit usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={width} aria-valuetext={`${alert.percent}% of the configured limit`} className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${isExceeded ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${width}%` }} /></div>
              <Link href={`/emissions?companyId=${encodeURIComponent(alert.id)}&month=${month}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-800 hover:underline">View Emissions<ChevronRight size={13} /></Link>
            </div>;
          })}
        </div>
      </> : <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-start gap-2.5">
        <CheckCircle2 size={24} className="text-slate-400 shrink-0" />
        <div><p className="text-sm font-semibold text-slate-800">No threshold alerts for this month</p><p className="text-xs text-slate-500 mt-2 leading-relaxed">No configured company limit has reached 80%. Companies without limits are excluded.</p></div>
      </div>}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 mt-auto pt-4"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />Warning at 80%</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Limit reached at 100%</span></div>
    </div>
  </section>;
}
