import Link from "next/link";
import { ClipboardCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Attention } from "@/lib/api/admin";

export function DataQualityAlerts({ month, issues }: { month: string; issues: Attention[] }) {
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return <section className="bg-white border border-[#e4eae7] rounded-xl shadow-xs overflow-hidden min-w-0 self-start">
    <div className="p-4 md:p-5 border-b border-slate-100">
      <h3 className="flex items-center gap-2 font-bold text-sm"><ClipboardCheck size={17} className="text-green-700" />Data Quality &amp; Submission Alerts</h3>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs"><span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">{monthLabel}</span><span className="text-slate-500">Submission completeness and record reviews</span></div>
    </div>
    <div className="p-4 md:p-5">
      {issues.length ? <>
        <p className="text-xs text-slate-500 mb-4">{new Set(issues.map(issue => issue.id)).size} companies with issues. A company may appear for more than one reason.</p>
        <div className="overflow-auto max-h-96"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["Company", "Issue and period", "Action"].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>
          {issues.map(issue => {
            const missing = issue.kind === "missing";
            const incomplete = issue.kind === "incomplete";
            const unknown = issue.unknownMonthCount ?? 0;
            const selectedCount = issue.count - unknown;
            const label = missing ? "Missing submission" : incomplete ? "Incomplete data" : "Needs review";
            const href = `/emissions?${new URLSearchParams({ companyId: issue.id, ...(incomplete ? { quality: "incomplete" } : { month, ...(missing ? {} : { quality: "review" }) }) })}`;
            return <tr key={`${issue.id}-${issue.kind}`} className="border-b border-slate-100 last:border-0">
              <td className="p-3 font-semibold align-top">{issue.name}</td>
              <td className="p-3 align-top"><span className={`inline-block rounded-full px-2 py-1 font-semibold ${incomplete ? "bg-red-50 text-red-800" : missing ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>{label}</span>
                {missing ? <p className="text-slate-500 mt-2">No entries for {monthLabel}.</p> : <div className="text-slate-500 mt-2 space-y-1">{selectedCount > 0 && <p>{selectedCount} {selectedCount === 1 ? "record" : "records"} for {monthLabel}.</p>}{unknown > 0 && <p>{unknown} {unknown === 1 ? "record has" : "records have"} no identifiable reporting month; the period needs correction.</p>}{incomplete && <p className="text-[11px]">View opens incomplete company records across all months.</p>}</div>}
              </td>
              <td className="p-3 align-top"><Link href={href} aria-label={`View records for ${issue.name}: ${label}`} className="inline-flex items-center gap-1 text-green-800 font-semibold hover:underline whitespace-nowrap">View records<ChevronRight size={13} /></Link></td>
            </tr>;
          })}
        </tbody></table></div>
        {issues.length >= 100 && <p className="text-xs text-slate-500 mt-3">Showing up to 100 company issue groups. Open Emissions for further records.</p>}
      </> : <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 flex items-start gap-3"><CheckCircle2 size={24} className="text-slate-400 shrink-0" /><div><p className="text-sm font-semibold text-slate-800">No data-quality issues detected</p><p className="text-xs text-slate-500 mt-2">No issues were found by the configured submission and review checks for this period.</p></div></div>}
    </div>
  </section>;
}
