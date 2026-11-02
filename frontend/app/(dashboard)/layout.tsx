"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthSessionProvider, useAuthSession } from "@/lib/auth/AuthSessionProvider";

// Keep administration pages out of company workspaces, including direct URLs.
function WorkspaceBoundary({ children }: { children: React.ReactNode }) {
  const { isAdminWorkspace, selectedCompanyId } = useAuthSession();
  const pathname = usePathname();
  const adminPage = pathname === "/companies" || pathname.startsWith("/admin/");
  // Do not redirect on workspace changes: a queued redirect from the previous
  // page can otherwise replace the company operation the admin just opened.
  if (adminPage && !isAdminWorkspace) {
    return (
      <>
        <Header title="Administration" subtitle="Admin workspace required" />
        <main id="page-content" tabIndex={-1} className="p-6 space-y-4">
          <p className="text-sm text-[#5F6B61]">
            This page is available only in the admin workspace. Use the workspace selector to return to Admin Dashboard.
          </p>
          <Link href="/dashboard" className="text-sm font-semibold text-[#2E7D32] underline">
            Return to company dashboard
          </Link>
        </main>
      </>
    );
  }
  return <React.Fragment key={selectedCompanyId}>{children}</React.Fragment>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  React.useEffect(()=>{const open=()=>setMobileMenuOpen(true);window.addEventListener("eco-open-sidebar",open);return()=>window.removeEventListener("eco-open-sidebar",open);},[]);
  const router = useRouter();
  const redirectToLogin = React.useCallback(() => router.replace("/login"), [router]);

  return (
    <AuthSessionProvider onInvalidSession={redirectToLogin}>
    <div className="min-h-screen bg-[#F8FAF8] flex">
      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <WorkspaceBoundary>{children}</WorkspaceBoundary>
      </div>
    </div>
    </AuthSessionProvider>
  );
}
