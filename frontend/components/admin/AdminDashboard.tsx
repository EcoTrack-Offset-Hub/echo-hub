"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CompanyEmissionsAlerts } from "@/components/admin/CompanyEmissionsAlerts";
import { Header } from "@/components/layout/Header";
import {
  adminApi,
  AdminData,
} from "@/lib/api/admin";
import {
  Building2,
  FileText,
  Leaf,
  ShieldCheck,
  ChevronRight,
  X,
  AlertTriangle,
} from "lucide-react";
const colors = [
  "#059b46",
  "#2998ff",
  "#a359ff",
  "#f5a623",
  "#e25c74",
  "#419eaa",
];
const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 11 });
const card = "bg-white border border-[#e4eae7] rounded-xl p-4 md:p-5 shadow-xs min-w-0";
function Panel({
  title,
  children,
  href,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <section className={`${card} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">{title}</h3>
        {href && (
          <Link className="text-xs text-blue-600" href={href}>
            View All
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
function Bars({
  rows,
  total,
}: {
  rows: { label: string; count: number; color: string; href: string }[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Link
          href={r.href}
          key={r.label}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 text-xs min-w-0"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: r.color }}
          />
          <span className="flex-1">
            {fmt(r.count)} {r.label}
          </span>
          <div className="col-span-3 row-start-2 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${total ? (r.count / total) * 100 : 0}%`,
                background: r.color,
              }}
            />
          </div>
          <span className="col-start-3 row-start-1 text-right text-slate-500">
            {total ? Math.round((r.count / total) * 100) : 0}%
          </span>
        </Link>
      ))}
    </div>
  );
}
export function AdminDashboard() {
  const company = "";
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [range, setRange] = useState("6M");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const c = new AbortController();
    let live = true;
    adminApi
      .dashboard(month, range, company, c.signal)
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      c.abort();
    };
  }, [month, range, company, retry]);
  useEffect(() => {
    const t = setTimeout(
      () => {
        const requestedMonth = new URLSearchParams(window.location.search).get("month");
        if (requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) setMonth(requestedMonth);
        setDismissed(
          sessionStorage.getItem("eco-admin-banner") === "dismissed",
        );
      },
      0,
    );
    return () => clearTimeout(t);
  }, []);
  const change = () => {
    setHover(null);
    setLoading(true);
    setData(null);
    setError("");
  };
  const emissionsHref = (quality?: string, id = company) =>
    `/emissions?${new URLSearchParams({ month, ...(id ? { companyId: id } : { all: "1" }), ...(quality ? { quality } : {}) })}`;
  const errorFor = (key: string) =>
    data?.errors[key] ? (
      <p role="alert" className="text-xs text-red-700">
        {data.errors[key]}{" "}
        <button
          className="underline"
          onClick={() => {
            change();
            setRetry(retry + 1);
          }}
        >
          Retry
        </button>
      </p>
    ) : null;
  const e = data?.emissions,
    m = data?.marketplace,
    f = data?.factors;
  const max = Math.max(1, ...(data?.trend || []).flatMap((s) => s.values));
  const inventory = m
    ? [
        { label: "Available Credits", value: m.available, color: "#059b46", href: "/admin/projects" },
        { label: "Sold", value: m.sold, color: "#ffb02e", href: "/admin/transactions" },
        { label: "Retired", value: m.retired, color: "#919aaa", href: "/admin/transactions" },
      ]
    : [];
  let cursor = 0;
  const gradient = inventory
    .map((i) => {
      const start = cursor;
      cursor += m?.total ? (i.value / m.total) * 100 : 0;
      return `${i.color} ${start}% ${cursor}%`;
    })
    .join(",");
  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#0b132b]">
      <Header
        title="Admin Overview"
        subtitle="Platform-wide sustainability and marketplace oversight"

      />
      <main id="page-content" tabIndex={-1}
        className="p-4 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto"
        aria-busy={loading}
      >
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, Admin
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Here’s the current platform health and sustainability activity
              overview.
            </p>
          </div>
          <label className="text-xs text-slate-500">
            Reporting month{" "}
            <input
              aria-label="Reporting month"
              type="month"
              value={month}
              onChange={(ev) => {
                if (ev.target.value) {
                  change();
                  setMonth(ev.target.value);
                }
              }}
              className="block border bg-white rounded-lg p-2 mt-1 text-slate-800"
            />
          </label>
        </div>
        {error && (
          <div role="alert" className={card}>
            <p className="text-red-700">{error}</p>
            <button
              className="mt-3 text-green-700 underline"
              onClick={() => {
                change();
                setRetry(retry + 1);
              }}
            >
              Retry dashboard
            </button>
          </div>
        )}
        {loading && !data && (
          <div role="status" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-slate-100 animate-pulse rounded-xl"
              />
            ))}
            <span className="sr-only">Loading dashboard</span>
          </div>
        )}
        {data && (
          <>
            {!dismissed && data.summary && (
              <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 p-3 flex gap-3 items-center">
                <Leaf size={25} />
                <Link href={emissionsHref()} className="text-sm font-semibold">
                  {data.summary.active} companies active
                  {data.summary.issues !== undefined
                    ? `, ${data.summary.issues} items require attention.`
                    : ". Attention status unavailable."}
                </Link>
                <button
                  aria-label="Dismiss summary"
                  className="ml-auto"
                  onClick={() => {
                    setDismissed(true);
                    sessionStorage.setItem("eco-admin-banner", "dismissed");
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  title: "Registered Companies",
                  value: data.summary?.registered,
                  note: `${data.summary?.active ?? 0} active tenants`,
                  icon: Building2,
                  href: "/companies",
                  key: "summary",
                },
                {
                  title: "Emission Records",
                  value: e?.records,
                  note: `${e?.weekly ?? 0} added this week in selected period`,
                  icon: FileText,
                  href: emissionsHref(),
                  key: "emissions",
                },
                {
                  title: "Total Recorded Emissions",
                  value: e?.total,
                  note: "All companies · reporting month · before offsets",
                  icon: Leaf,
                  href: emissionsHref(),
                  unit: "tCO₂e",
                  key: "emissions",
                },
                {
                  title: "Active Projects",
                  value: m?.active,
                  note: "Enabled marketplace projects",
                  icon: ShieldCheck,
                  href: "/admin/projects",
                  key: "marketplace",
                },
              ].map((k) => (
                <section key={k.title} className={card}>
                  {errorFor(k.key) || (
                    <Link href={k.href} className="flex items-start gap-3">
                      <k.icon className="text-green-700 mt-1 shrink-0" size={22} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{k.title}</p>
                        <p className="text-2xl font-bold my-2">
                          {fmt(k.value ?? 0)}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {k.unit}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">{k.note}</p>
                      </div>
                    </Link>
                  )}
                </section>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 items-stretch">
              {data.errors.thresholdAlerts ? <Panel title="Company Emissions Alerts">{errorFor("thresholdAlerts")}</Panel> : data.thresholdAlerts ? <CompanyEmissionsAlerts month={month} alerts={data.thresholdAlerts} /> : <Panel title="Company Emissions Alerts"><p className="text-sm text-slate-500">Threshold alerts are unavailable.</p></Panel>}
              <Panel title="Marketplace Inventory Health" className="h-full flex flex-col">
                <p className="text-xs text-slate-500 -mt-2 mb-4">
                  Platform inventory · all time
                </p>
                {errorFor("marketplace") ||
                  (m && (
                    <>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div
                          className="w-24 h-24 shrink-0 rounded-full p-3"
                          style={{
                            background: m.total
                              ? `conic-gradient(${gradient})`
                              : "#edf1ee",
                          }}
                          role="img"
                          aria-label={inventory
                            .map((i) => `${i.label}: ${i.value} tCO₂e`)
                            .join(", ")}
                        >
                          <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                            <strong className="text-base">{fmt(m.total)}</strong>
                            <span className="text-[10px] text-slate-500">
                              tCO₂e
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Total inventory
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 w-full min-w-0">
                          {inventory.map((i) => (
                            <Link
                              href={i.href}
                              key={i.label}
                              className="block text-xs"
                            >
                              <span className="flex gap-2 items-center text-slate-500">
                                <i
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ background: i.color }}
                                />
                                {i.label}
                              </span>
                              <span className="font-bold ml-4">
                                {fmt(i.value)}
                              </span>
                              <span className="float-right text-slate-500">
                                {m.total
                                  ? ((i.value / m.total) * 100).toFixed(1)
                                  : 0}
                                %
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-3">
                        Immediate purchases; reservations are not supported.
                        Sold excludes documented retirements.
                      </p>
                      {m.unconfigured > 0 && (
                        <Link
                          href="/admin/projects"
                          className="block text-xs text-amber-700 mt-2"
                        >
                          Set inventory thresholds for {m.unconfigured} projects
                        </Link>
                      )}
                    </>
                  ))}
                {errorFor("lowInventory") ||
                  ((data.lowInventory?.length ?? 0) > 0 && (
                    <Link
                      href="/admin/projects?low=1"
                      className="mt-3 flex items-center gap-2 bg-amber-50 text-amber-800 rounded-lg p-2 text-xs"
                    >
                      <AlertTriangle size={15} />
                      {data.lowInventory!.length} projects below inventory
                      threshold
                      <ChevronRight size={15} />
                    </Link>
                  ))}
              </Panel>
                <Panel title="Data Quality" className="h-full flex flex-col">
                  {errorFor("emissions") ||
                    (e && (
                      <>
                      <p className="text-xs text-slate-500 -mt-2 mb-4">{fmt(e.records)} {e.records === 1 ? "record" : "records"} for the selected month</p>
                      {e.records === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                        <FileText size={24} className="mx-auto text-slate-400 mb-3" />
                        <p className="text-sm font-semibold text-slate-700">No emissions records for this month</p>
                        <p className="text-xs text-slate-500 mt-2">Choose a reporting month with saved records to see data quality.</p>
                      </div> : <Bars
                        total={e.records}
                        rows={[
                          {
                            label: "validated",
                            count: e.validated,
                            color: "#15b970",
                            href: emissionsHref("validated"),
                          },
                          {
                            label: "require review",
                            count: e.review,
                            color: "#ffaf23",
                            href: emissionsHref("review"),
                          },
                          {
                            label: "incomplete",
                            count: e.incomplete,
                            color: "#f04452",
                            href: emissionsHref("incomplete"),
                          },
                        ]}
                      />}
                      </>
                    ))}
                  <p className="text-[10px] text-slate-500 mt-3">
                    Validation status is not third-party certification.
                  </p>
                </Panel>
                <Panel title="Emission Factors" className="h-full flex flex-col">
                  {errorFor("factors") ||
                    (f && (
                      <>
                        <p className="text-xs text-slate-500 -mt-2 mb-4">{fmt(f.total)} saved factor {f.total === 1 ? "version" : "versions"}</p>
                        <Bars
                          total={f.total}
                          rows={[
                            {
                              label: "active, not overdue",
                              count: f.active,
                              color: "#15b970",
                              href: "/admin/factors",
                            },
                            {
                              label: "inactive",
                              count: f.inactive,
                              color: "#ffaf23",
                              href: "/admin/factors",
                            },
                            {
                              label: "review overdue",
                              count: f.outdated,
                              color: "#f04452",
                              href: "/admin/factors",
                            },
                          ]}
                        />
                        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">{fmt(f.active + f.outdated)} enabled for calculations. Overdue versions remain active until replaced.</p>
                        {f.undated > 0 && (
                          <p className="text-[10px] text-slate-500 mt-3">
                            {f.undated} active factors have no review date.
                          </p>
                        )}
                      </>
                    ))}
                </Panel>
            </div>
            <div className="grid grid-cols-1 gap-4 items-start">
              <Panel title="Emissions Across Companies" className="flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500">
                  <span>Monthly total emissions (tCO₂e)</span>
                  <div className="bg-slate-100 text-slate-600 rounded-lg p-1 flex">
                    {["3M", "6M", "12M"].map((r) => (
                      <button
                        aria-pressed={r === range}
                        key={r}
                        onClick={() => {
                          change();
                          setRange(r);
                        }}
                        className={`px-3 py-1.5 rounded-md ${r === range ? "bg-green-700 text-white" : ""}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {errorFor("trend") ||
                  (!(data.trend || []).some((s) =>
                    s.values.some((v) => v > 0),
                  ) ? (
                    <p className="h-52 flex items-center justify-center text-sm text-slate-500">
                      No calculated emissions in this reporting range.
                    </p>
                  ) : (
                    <div className="relative mt-4 flex-1 flex items-center min-h-64">
                      <svg
                        viewBox="0 0 600 240"
                        className="w-full h-auto max-h-80"
                        role="group"
                        aria-label="Monthly emissions across selected companies"
                      >
                        {[0, 1, 2, 3, 4].map((i) => (
                          <g key={i}>
                            <line
                              x1="40"
                              x2="580"
                              y1={200 - i * 45}
                              y2={200 - i * 45}
                              stroke="#e9edf0"
                            />
                            <text
                              x="0"
                              y={204 - i * 45}
                              fontSize="10"
                              fill="#64748b"
                            >
                              {fmt((max * i) / 4)}
                            </text>
                          </g>
                        ))}
                        {data.window.months.map((mo, i) => (
                          <text
                            key={mo}
                            x={50 + (i * 520) / (data.window.months.length - 1)}
                            y="225"
                            fontSize="10"
                            textAnchor="middle"
                            fill="#64748b"
                          >
                            {new Date(mo + "-01T00:00:00Z").toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "2-digit",
                                timeZone: "UTC",
                              },
                            )}
                          </text>
                        ))}
                        {data.trend?.map((s, si) => (
                          <g key={s.id}>
                            <polyline
                              fill="none"
                              stroke={colors[si % colors.length]}
                              strokeWidth="2"
                              points={s.values
                                .map(
                                  (v, i) =>
                                    `${50 + (i * 520) / (s.values.length - 1)},${200 - (v / max) * 180}`,
                                )
                                .join(" ")}
                            />
                            {s.values.map((v, i) => (
                              <circle
                                key={i}
                                cx={50 + (i * 520) / (s.values.length - 1)}
                                cy={200 - (v / max) * 180}
                                r="4"
                                fill={colors[si % colors.length]}
                                stroke="white"
                              >
                                <title>
                                  {s.name} · {data.window.months[i]} · {fmt(v)}{" "}
                                  tCO₂e
                                </title>
                              </circle>
                            ))}
                          </g>
                        ))}
                        {data.window.months.map((mo, i) => (
                          <rect
                            key={mo}
                            x={35 + (i * 520) / (data.window.months.length - 1)}
                            y="15"
                            width="30"
                            height="190"
                            fill="transparent"
                            tabIndex={0}
                            role="button"
                            onKeyDown={event => { if (event.key === "Escape") setHover(null); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setHover(i); } }}
                            aria-label={`${mo}: ${data.trend?.map((s) => s.name + " " + fmt(s.values[i]) + " tCO₂e").join(", ")}`}
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover(i)}
                            onBlur={() => setHover(null)}
                          />
                        ))}
                      </svg>
                      {hover !== null && (
                        <div className="absolute top-0 right-0 bg-white border shadow rounded-lg p-3 text-xs pointer-events-none">
                          <strong>{data.window.months[hover]}</strong>
                          {data.trend?.map((s) => (
                            <p key={s.id}>
                              {s.name}: {fmt(s.values[hover])} tCO₂e
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-500">
                  {data.trend?.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-2">
                      <i
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: colors[i % colors.length] }}
                      />
                      {s.name}
                    </span>
                  ))}
                </div>
              </Panel>


            </div>
          </>
        )}
      </main>
    </div>
  );
}
