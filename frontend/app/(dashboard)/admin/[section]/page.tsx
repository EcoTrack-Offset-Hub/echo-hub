"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { TransactionManagement } from "@/components/admin/TransactionManagement";
import { FactorManagement } from "@/components/admin/FactorManagement";
import { ProjectManagement } from "@/components/admin/ProjectManagement";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { useAuthSession } from "@/lib/auth/AuthSessionProvider";
import { apiClient } from "@/lib/api/client";
import {
  Activity,
  activityHref,
  relativeTime,
} from "@/lib/api/admin";
type Row = Record<string, string | number | boolean | null>;
const inputClass = "border rounded-lg p-2 text-sm bg-white w-full";
export default function AdminManagement() {
  const { user } = useAuthSession();
  const { section } = useParams<{ section: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [factorFormOpen, setFactorFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [form, setForm] = useState<Record<string, string>>({
    category: "Purchased Electricity",
    defaultScope: "Scope 2",
    status: "Unreviewed",
    active: "true",
  });
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const result = await apiClient<Row[] | { rows: Row[]; total: number }>(
          `/api/admin/${section}?page=${page}${section === "audit" ? `&pageSize=${auditPageSize}` : ""}${section === "projects" && new URLSearchParams(window.location.search).get("low") === "1" ? "&low=1" : ""}`,
        );
        if (live) {
          if (Array.isArray(result)) {
            setRows(result);
            setTotal(result.length);
          } else {
            const d = result as { rows: Row[]; total: number };
            if (section === "audit" && page > Math.max(1, Math.ceil(d.total / auditPageSize))) {
              setPage(Math.max(1, Math.ceil(d.total / auditPageSize)));
              return;
            }
            setRows(d.rows);
            setTotal(d.total);
          }
          setError("");
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Unable to load");
      } finally {
        if (live) setLoading(false);
      }
    }
    if (user.role === "ADMIN") void load();
    return () => {
      live = false;
    };
  }, [section, page, auditPageSize, refresh, user.role]);
  if (user.role !== "ADMIN")
    return <main className="p-8">Administrator access required.</main>;
  if (!["factors", "projects", "transactions", "audit"].includes(section)) notFound();
  const reload = () => {
    setLoading(true);
    setRefresh(refresh + 1);
  };
  async function save(path: string, body: unknown, method = "POST") {
    setSaving(true);
    setNotice("");
    try {
      await apiClient(path, { method, body: JSON.stringify(body) });
      setError("");
      setNotice("Saved successfully.");
      if (path === "/api/admin/factors") setFactorFormOpen(false);
      if (path === "/api/admin/projects" && method === "POST") setProjectFormOpen(false);
      reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setSaving(false);
    }
  }
  const field = (name: string, label: string, type = "text") => (
    <label key={name} className="text-xs text-slate-600">
      {label}
      <input
        required={name !== "reviewDue" && name !== "imageUrl"}
        type={type}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? 0 : undefined}
        className={inputClass}
        value={form[name] || ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
    </label>
  );
  const select = (name: string, label: string, options: string[]) => (
    <label className="text-xs text-slate-600">
      {label}
      <select
        className={inputClass}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  const title =
    section === "factors"
      ? "Emission Factors"
      : section === "projects"
        ? "Offset Project Administration"
        : section === "audit"
          ? "Audit Logs"
          : "Transaction Review";
  return (
    <div>
      <Header title={title} subtitle="EcoTrack platform administration" />
      <main className="p-5 lg:p-8 space-y-5">
        {error && (
          <div role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">
            {error}{" "}
            <button onClick={reload} className="underline">
              Retry
            </button>
          </div>
        )}
        {notice && (
          <div role="status" aria-live="polite" className="fixed top-20 right-4 sm:right-8 z-[60] flex items-center gap-3 max-w-[calc(100vw-2rem)] rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-800 shadow-lg">
            <CheckCircle2 size={20} className="shrink-0 text-green-600" />
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss success notification" onClick={() => setNotice("")} className="rounded p-1 hover:bg-green-50"><X size={16} /></button>
          </div>
        )}
        {loading && <p role="status">Loading records...</p>}
        {section === "factors" && (
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div><h2 className="text-lg font-semibold">Emission Factors</h2><p className="text-xs text-slate-500 mt-1">Compare conversion values and inspect their calculation evidence.</p></div>
            <button
              type="button"
              aria-haspopup="dialog"
              disabled={saving}
              onClick={() => setFactorFormOpen(true)}
              className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm"
            >
              Add Factor Version
            </button>
          </div>
        )}
        {section === "factors" && factorFormOpen && (
          <Modal
            isOpen={factorFormOpen}
            onClose={() => { if (!saving) setFactorFormOpen(false); }}
            title="Add Factor Version"
            subtitle="Publish a conversion factor with its source and assumptions"
            maxWidth="2xl"
          >
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          <form
            id="factor-version-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save("/api/admin/factors", {
                ...form,
                active: form.active === "true",
              });
            }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-500">
              Creates a new version; saved calculation results and their factor
              references remain intact. Review dates are optional and overdue
              active factors are flagged for review.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {select("category", "Category", [
                "Purchased Electricity",
                "Fleet & Fuel",
                "Facilities",
                "Business Travel",
                "Purchased Goods",
                "Logistics & Freight",
                "Other",
              ])}
              {field("factor", "Factor (kg CO₂e per base unit)", "number")}
              {field("methodology", "Methodology")}
              {field("standard", "Standard")}
              {field("sourceReference", "Factor source / publication and year")}
              {field("assumptions", "Applicability and assumptions")}
              {select("defaultScope", "Scope", [
                "Scope 1",
                "Scope 2",
                "Scope 3",
              ])}
              {field("reviewDue", "Review due", "date")}
              {select("active", "Enable for new calculations", [
                "true",
                "false",
              ])}
            </div>
            <button
              disabled={saving}
              className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm"
            >
              Publish version
            </button>
            <button type="button" disabled={saving} onClick={() => setFactorFormOpen(false)} className="ml-3 border rounded-lg px-4 py-2 text-sm">Cancel</button>
          </form>
          </Modal>
        )}
        {section === "projects" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Offset Projects</h2>
            <button type="button" aria-haspopup="dialog" disabled={saving} onClick={() => setProjectFormOpen(true)} className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm">
              Create Project
            </button>
          </div>
        )}
        {section === "projects" && projectFormOpen && (
          <Modal isOpen={projectFormOpen} onClose={() => { if (!saving) setProjectFormOpen(false); }} title="Create Offset Project" subtitle="Enter project details, certification evidence, and inventory" maxWidth="2xl"
            footer={<div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setProjectFormOpen(false)} className="border rounded-lg px-4 py-2 text-sm">Cancel</button>
              <button type="submit" form="create-offset-project" disabled={saving} className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">{saving ? "Creating..." : "Create Project"}</button>
            </div>}
          >
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          <form id="create-offset-project"
            onSubmit={event => { event.preventDefault(); void save("/api/admin/projects", form); }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {field("name", "Name")}
              {field("imageUrl", "Image URL (optional, HTTPS)", "url")}
              {field("type", "Type")}
              {field("location", "Location")}
              {field("country", "Country")}
              {field("standard", "Standard")}
              {select("status", "Lifecycle status", ["Unreviewed", "Active", "Inactive"])}
              <label className="block text-xs text-slate-600 sm:col-span-2">Description
                <textarea required rows={2} value={form.description || ""} onChange={event => setForm({ ...form, description: event.target.value })} className={inputClass + " mt-1 resize-y"} />
              </label>
              {field("registryRef", "Registry project reference")}
              {field("registryUrl", "Public registry URL", "url")}
              <label className="block text-xs text-slate-600 sm:col-span-2">Certification review evidence
                <textarea required rows={2} value={form.certificationEvidence || ""} onChange={event => setForm({ ...form, certificationEvidence: event.target.value })} className={inputClass + " mt-1 resize-y"} />
              </label>
              {field("price", "Price per tonne", "number")}
              {field("available", "Available credits (tCO2e)", "number")}
              {field("threshold", "Low inventory threshold (tCO2e)", "number")}
            </div>
          </form>
          </Modal>
        )}
        {section === "projects" && <ProjectManagement rows={rows} loading={loading} saving={saving} errorMessage={error} onSave={save} />}
        {section === "factors" && <FactorManagement rows={rows} loading={loading} onAdd={() => setFactorFormOpen(true)} />}
        {section === "transactions" && <TransactionManagement key={page} rows={rows} loading={loading} saving={saving} errorMessage={error} onSave={save} />}
        {section === "audit" && <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Event", "Entity", "Timestamp", "Action"].map((h, i) => (
                  <th key={i} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.id || i}-${refresh}`} className="border-t">

                    <>
                      <td className="p-3">{r.description}</td>
                      <td>{r.entityType}</td>
                      <td>
                        <time title={String(r.createdAt)}>
                          {relativeTime(String(r.createdAt))}
                        </time>
                      </td>
                      <td>
                        <Link
                          className="text-green-700"
                          href={activityHref(r as unknown as Activity)}
                        >
                          Open
                        </Link>
                      </td>
                    </>

                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && !error && (
            <p className="p-6 text-slate-500 text-sm">No records found.</p>
          )}
        </div>}
        {section === "audit" && <Pagination page={page} pageSize={auditPageSize} total={total} loading={loading} onPageChange={next => { setLoading(true); setRows([]); setPage(next); }} onPageSizeChange={size => { setLoading(true); setRows([]); setPage(1); setAuditPageSize(size); }} />}
        {section === "transactions" && (
          <div className="flex gap-4 items-center text-sm">
            <button
              disabled={page <= 1 || loading}
              onClick={() => {
                setPage(page - 1);
                setLoading(true);
              }}
            >
              Previous
            </button>
            <span>
              Page {page} · {total} records
            </span>
            <button
              disabled={page * 30 >= total || loading}
              onClick={() => {
                setPage(page + 1);
                setLoading(true);
              }}
            >
              Next
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
