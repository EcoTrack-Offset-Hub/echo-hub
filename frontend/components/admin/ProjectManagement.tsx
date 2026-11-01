"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Row = Record<string, string | number | boolean | null>;
type Save = (path: string, body: unknown, method?: string) => Promise<boolean>;
const input = "block w-full mt-1 rounded-lg border border-slate-300 bg-white p-2.5 text-sm";
const text = (row: Row, key: string) => String(row[key] ?? "");
const quantity = (value: Row[string]) => value == null ? "Not configured" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
const demo = (row: Row) => /demo|fictional|test data/i.test([row.name, row.registry_ref, row.certification_evidence].join(" "));

export function ProjectManagement({ rows, loading, saving, errorMessage, onSave }: { errorMessage: string; rows: Row[]; loading: boolean; saving: boolean; onSave: Save }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dialog, setDialog] = useState<{ row: Row; mode: "View" | "Edit" | "Restock" } | null>(null);
  const [tab, setTab] = useState("details");
  const [error, setError] = useState("");
  const visible = rows.filter(row => text(row, "name").toLowerCase().includes(search.toLowerCase()) && (status === "All" || row.lifecycle_status === status));
  function open(row: Row, mode: "View" | "Edit" | "Restock") { setError(""); setTab("details"); setDialog({ row, mode }); }
  async function submit(event: React.FormEvent<HTMLFormElement>, path: string, transform?: (values: Record<string, FormDataEntryValue>) => unknown) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = transform ? transform(values) : values;
    if (transform && body && typeof body === "object" && !Object.keys(body).length) { setDialog(null); return; }
    if (await onSave(path, body, dialog?.mode === "Restock" ? "POST" : "PATCH")) setDialog(null);
    else setError("Unable to save. Check the error message on the page and your entered values, then try again.");
  }
  const row = dialog?.row;
  const field = (key: string, label: string, type = "text", optional = false) => <label className="block text-xs text-slate-600">{label}<input name={key} type={type} required={!optional} className={input} defaultValue={row ? text(row, key) : ""} /></label>;
  return <>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-slate-600 flex-1 min-w-48">Search projects<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by project name" className={input} /></label>
      <label className="text-xs text-slate-600">Status<select value={status} onChange={e => setStatus(e.target.value)} className={input}>{["All", "Unreviewed", "Active", "Inactive"].map(value => <option key={value}>{value}</option>)}</select></label>
      <span className="text-xs text-slate-500 pb-3">{visible.length} of {rows.length} projects</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {visible.map(project => {
        const lowStock = project.low_inventory_threshold != null && Number(project.available_tco2e) < Number(project.low_inventory_threshold);
        return <article key={text(project, "id")} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-44 bg-slate-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={text(project, "image_url") || "/project-placeholder.svg"} alt={text(project, "name")} className="h-full w-full object-cover" onError={event => { if (!event.currentTarget.src.endsWith('/project-placeholder.svg')) event.currentTarget.src = '/project-placeholder.svg'; }} />
            <div className="absolute top-3 inset-x-3 flex flex-wrap justify-between gap-2">
              <span className={`rounded-full border border-white/70 px-2.5 py-1 text-xs font-semibold shadow-sm ${project.lifecycle_status === "Active" ? "bg-green-50 text-green-800" : project.lifecycle_status === "Unreviewed" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{project.lifecycle_status}</span>
              {demo(project) && <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 text-xs font-semibold shadow-sm">Demo only</span>}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-bold text-base text-slate-900">{project.name}</h3>
            <p className="text-xs text-slate-500 mt-2">{project.location} ? {project.country} ? {project.type}</p>
            <p className="mt-3 text-sm text-slate-600 line-clamp-2">{project.description}</p>
            <div className="mt-auto pt-5">
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-4">
                <p><strong className="text-xl text-slate-900">${Number(project.price_per_tonne).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><span className="text-xs text-slate-500"> / tCO2e</span></p>
                <p className="text-xs text-slate-600">{quantity(project.available_tco2e)} tCO2e available</p>
              </div>
              <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs">
                <span className="text-slate-500">Low-stock threshold: {quantity(project.low_inventory_threshold)}{project.low_inventory_threshold != null && " tCO2e"}</span>
                {lowStock && <span className="font-medium text-amber-800">Low stock</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">{(["View", "Edit", "Restock"] as const).map(mode => <button key={mode} type="button" disabled={saving} aria-label={`${mode} ${project.name}`} onClick={() => open(project, mode)} className={`rounded-lg px-2 py-2.5 text-xs font-semibold disabled:opacity-50 ${mode === "View" ? "bg-green-700 text-white hover:bg-green-800" : "border border-slate-200 text-green-800 hover:bg-green-50"}`}>{mode}</button>)}</div>
            </div>
          </div>
        </article>;
      })}
      {!loading && !visible.length && <p className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{rows.length ? "No projects match these filters." : "No projects found."}</p>}
    </div>
    {dialog && row && <Modal isOpen onClose={() => { if (!saving) setDialog(null); }} title={`${dialog.mode} Project`} subtitle={text(row, "name")} maxWidth="2xl"
      footer={<div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm">{dialog.mode === "View" ? "Close" : "Cancel"}</button>{dialog.mode !== "View" && <button type="submit" form="project-action" disabled={saving} className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm">{saving ? "Saving..." : dialog.mode === "Restock" ? "Add inventory" : "Save changes"}</button>}</div>}>
      {error && <p role="alert" className="text-sm text-red-700 mb-4">{errorMessage || error}</p>}
      {dialog.mode === "View" ? <div className="space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={text(row, "image_url") || "/project-placeholder.svg"} alt={text(row, "name")} className="w-full h-48 rounded-xl object-cover" onError={e => { e.currentTarget.onerror = null; if (!e.currentTarget.src.endsWith('/project-placeholder.svg')) e.currentTarget.src = '/project-placeholder.svg'; }} />
        {demo(row) && <p className="rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">Demonstration project. Its fictional records do not establish certification.</p>}
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">{[["Type", "type"], ["Location", "location"], ["Country", "country"], ["Standard", "standard"], ["Price per tonne", "price_per_tonne"], ["Status", "lifecycle_status"], ["Registry reference", "registry_ref"], ["Low-stock threshold (tCO₂e)", "low_inventory_threshold"]].map(([label, key]) => <div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words">{text(row, key) || "Not configured"}</dd></div>)}</dl>
        <p className="text-sm whitespace-pre-wrap">{row.description}</p><p className="text-sm whitespace-pre-wrap"><strong>Certification evidence:</strong> {row.certification_evidence || "Not recorded"}</p>
        {/^https:\/\//.test(text(row, "registry_url")) && <a href={text(row, "registry_url")} target="_blank" rel="noreferrer" className="text-green-700 underline text-sm">Open public registry</a>}
      </div> : dialog.mode === "Restock" ? <form id="project-action" className="space-y-4" onSubmit={e => { void submit(e, `/api/admin/projects/${row.id}/restock`); }}>
        <p className="text-sm text-slate-600">Available: {quantity(row.available_tco2e)} tCO₂e. Add only newly allocated credits and their unique reference.</p>
        <label className="block text-xs text-slate-600">Quantity to add (tCO₂e)<input className={input} name="quantity" type="number" min="0.01" step="0.01" required /></label>
        <label className="block text-xs text-slate-600">Registry allocation reference<input className={input} name="reference" minLength={3} maxLength={255} required /></label>
      </form> : <>
        <div className="flex gap-2 mb-4">{[["details", "Project details"], ["settings", "Status and certification"]].map(([value, label]) => <button key={value} type="button" disabled={saving} aria-pressed={tab === value} onClick={() => { setTab(value); setError(""); }} className={`rounded-lg px-3 py-2 text-sm ${tab === value ? "bg-green-100 text-green-800" : "bg-slate-100"}`}>{label}</button>)}</div>
        {tab === "details" ? <form key="details" id="project-action" className="grid sm:grid-cols-2 gap-4" onSubmit={e => { void submit(e, `/api/admin/projects/${row.id}/details`, values => Object.fromEntries(Object.entries(values).filter(([key, value]) => String(value) !== text(row, key === "imageUrl" ? "image_url" : key === "price" ? "price_per_tonne" : key)))); }}>
          <p className="sm:col-span-2 text-xs text-slate-600">Changes to identity, standard or description return the project to Unreviewed. Price and image changes retain the current status. Save this tab before switching.</p>
          {field("name", "Name")}{field("type", "Type")}{field("location", "Location")}{field("country", "Country")}{field("standard", "Standard")}
          <label className="block text-xs text-slate-600">Price per tonne<input className={input} name="price" type="number" min="0.01" step="0.01" defaultValue={text(row, "price_per_tonne")} required /></label>
          <label className="block text-xs text-slate-600 sm:col-span-2">Image URL (optional, HTTPS)<input className={input} type="url" name="imageUrl" defaultValue={text(row, "image_url")} /></label>
          <label className="block text-xs text-slate-600 sm:col-span-2">Description<textarea className={input} rows={3} name="description" defaultValue={text(row, "description")} required /></label>
        </form> : <form key="settings" id="project-action" className="grid sm:grid-cols-2 gap-4" onSubmit={e => { void submit(e, `/api/admin/projects/${row.id}`); }}>
          <p className="sm:col-span-2 text-xs text-slate-600">Active enables purchases; it does not independently certify credits. Review the registry and evidence before activating.</p>
          <label className="block text-xs text-slate-600">Status<select className={input} name="status" defaultValue={text(row, "lifecycle_status")}>{["Unreviewed", "Active", "Inactive"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-xs text-slate-600">Low-stock threshold (tCO₂e)<input name="threshold" type="number" min="0" step="0.01" required defaultValue={text(row, "low_inventory_threshold")} className={input} /></label>
          <label className="block text-xs text-slate-600">Registry reference<input className={input} name="registryRef" defaultValue={text(row, "registry_ref")} /></label>
          <label className="block text-xs text-slate-600">Public registry URL<input className={input} name="registryUrl" type="url" defaultValue={text(row, "registry_url")} /></label>
          <label className="block sm:col-span-2 text-xs text-slate-600">Certification review evidence<textarea className={input} name="certificationEvidence" rows={3} defaultValue={text(row, "certification_evidence")} /></label>
        </form>}
      </>}
    </Modal>}
  </>;
}
