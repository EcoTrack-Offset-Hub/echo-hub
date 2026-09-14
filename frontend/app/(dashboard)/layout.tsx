"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthSessionProvider } from "@/lib/auth/AuthSessionProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        {children}
      </div>
    </div>
    </AuthSessionProvider>
  );
}
