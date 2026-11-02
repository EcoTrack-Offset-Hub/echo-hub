"use client";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <Header title="Help & Support" subtitle="Administrator guide" />
      <main className="p-4 md:p-7 max-w-6xl mx-auto space-y-4">
        <Link href="/dashboard" className="inline-block text-sm text-green-800 underline">Back to dashboard</Link>
        <section className="bg-white border border-slate-200 rounded-xl p-6" aria-labelledby="admin-workspace-guide">
          <h2 id="admin-workspace-guide" className="font-bold">Your role as administrator</h2>
          <p className="text-sm text-slate-600 mt-2">
            Monitor all companies, maintain calculation factors and certified project information,
            and review records. Companies enter their activities, view emissions reports, and purchase offsets in their own workspace.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            The reporting month controls emissions, data quality, threshold alerts, and attention checks.
            Company counts, factor versions, marketplace inventory, and recent activity cover the platform as a whole.
            Use the workspace selector in the header to open a company workspace.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-sm text-green-800">Admin pages and what to do next</summary>
            <nav aria-label="Admin management pages" className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
              {[
                { title: "Companies", href: "/companies", description: "Register companies, manage access, and set monthly emissions limits." },
                { title: "Emissions", href: "/emissions?all=1", description: "Inspect calculations and approve, reject, or comment on a record using its Review action." },
                { title: "Emission Factors", href: "/admin/factors", description: "Publish factor versions with sources, assumptions, and review dates." },
                { title: "Offset Projects", href: "/admin/projects", description: "Review certification evidence, activate projects, and manage prices and stock." },
                { title: "Transactions", href: "/admin/transactions", description: "Inspect purchases and record retirement evidence with a registry reference." },
              ].map(page => (
                <Link key={page.title} href={page.href} className="border border-slate-200 rounded-lg p-3 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-green-700">
                  <span className="text-sm font-semibold text-green-800">{page.title}</span>
                  <p className="text-xs text-slate-600 mt-1">{page.description}</p>
                </Link>
              ))}
            </nav>
          </details>
          <p className="text-xs text-slate-600 mt-4">Missing submissions and records needing attention appear on the dashboard. <Link href="/admin/audit" className="text-green-800 underline">Open Audit Logs</Link> to inspect recorded platform changes.</p>
        </section>
      </main>
    </div>
  );
}
