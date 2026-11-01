import type { CompanyDashboardData } from "@/lib/api/dashboard";

export function EmissionsThresholdNotice({ threshold, total, period }: {
  threshold: CompanyDashboardData["emissionsThreshold"];
  total: number;
  period: string;
}) {
  if (!threshold) return null;
  const { status, limitTonnes, usedPercent } = threshold;
  const format = (value: number | string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 11 });
  const tone = status === "exceeded" ? "bg-red-50 border-red-200 text-red-900" : status === "warning" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-[#E2E8E3] text-[#374151]";
  return <section role={status === "warning" || status === "exceeded" ? "alert" : "status"} aria-label="Monthly emissions threshold" className={`border rounded-xl p-4 space-y-2 ${tone}`}>
    <h2 className="text-sm font-bold">Monthly emissions threshold{status === "warning" ? " — Approaching limit" : status === "exceeded" ? " — Limit reached or exceeded" : status === "normal" ? " — Within limit" : ""}</h2>
    {status === "not_configured" ? <p className="text-sm">No monthly limit is set. An administrator can configure it in Companies → Edit Company.</p> : status === "select_month" ? <p className="text-sm">Monthly limit: {format(limitTonnes!)} tCO₂e. Select a single month to check its status; quarterly and annual totals are not compared with a monthly limit.</p> : <>
      <p className="text-sm">{period}: {format(total)} of {format(limitTonnes!)} tCO₂e ({usedPercent}% used).</p>
      <progress aria-label="Monthly emissions limit used" className={`w-full h-2 ${status === "exceeded" ? "accent-red-600" : status === "warning" ? "accent-amber-500" : "accent-green-700"}`} max={100} value={Math.min(usedPercent || 0, 100)} />
      <p className="text-xs">{Number(threshold.remainingTonnes) < 0 ? `${format(Math.abs(Number(threshold.remainingTonnes)))} tCO₂e over the limit.` : `${format(threshold.remainingTonnes!)} tCO₂e remaining.`} Warning at 80%; alert at 100%. Calculated from recorded gross emissions before offsets.</p>
    </>}
    <p className="text-xs opacity-75">This is a company monitoring target, not a legal limit. The current setting also applies when viewing previous months.</p>
  </section>;
}
