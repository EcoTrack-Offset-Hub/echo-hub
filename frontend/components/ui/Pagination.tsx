"use client";

export function Pagination({ page, pageSize, total, loading, onPageChange, onPageSizeChange }: {
  page: number; pageSize: number; total: number; loading: boolean;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const numbers = [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  const button = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed";
  return <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      <p role="status">Showing {total ? Math.min((page - 1) * pageSize + 1, total) : 0}–{Math.min(page * pageSize, total)} of {total.toLocaleString()} records</p>
      <label className="flex items-center gap-2">Rows per page<select value={pageSize} disabled={loading} onChange={event => onPageSizeChange(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white p-2">{[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
    </div>
    <nav aria-label="Audit log pagination" className="flex flex-wrap items-center gap-1.5">
      <button className={button} disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {numbers.map((number, i) => <span key={number} className="flex items-center gap-1.5">{i > 0 && number - numbers[i - 1] > 1 && <span aria-hidden className="px-1 text-slate-400">…</span>}<button disabled={loading} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} className={`${button} ${page === number ? "!bg-green-700 text-white !border-green-700" : ""}`} onClick={() => onPageChange(number)}>{number}</button></span>)}
      <button className={button} disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  </div>;
}
