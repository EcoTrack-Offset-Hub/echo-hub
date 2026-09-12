"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/ui/Logo";
import {
  LayoutDashboard,
  CloudSun,
  Coins,
  Wallet,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from "lucide-react";
import { authService } from "@/lib/api/auth";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Emissions", href: "/emissions", icon: CloudSun },
    { label: "Offset Marketplace", href: "/marketplace", icon: Coins },
    { label: "Transactions", href: "/transactions", icon: Wallet },
    { label: "Reports", href: "/reports", icon: FileText },
  ];

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB] w-60 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <Logo size="md" href="/dashboard" />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[#6B7280] hover:text-[#111827] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[#E8F5E9] text-[#2E7D32] font-semibold shadow-xs"
                  : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 transition-colors",
                  isActive ? "text-[#2E7D32]" : "text-[#6B7280] group-hover:text-[#111827]"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation & Profile */}
      <div className="p-3 border-t border-[#E5E7EB] space-y-2">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          >
            <Settings className="w-4 h-4 text-[#6B7280]" />
            <span>Settings</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#6B7280]" />
            <span>Help & Support</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center text-xs font-bold text-[#2E7D32] border border-[#C8E6C9] flex-shrink-0">
              JD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[#111827] truncate">Jordan Davis</p>
              <p className="text-[10px] text-[#6B7280] truncate">Sustainability Mgr</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-60">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          <div className="relative z-10 w-60 flex-1 flex">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
