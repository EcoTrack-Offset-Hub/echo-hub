"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { authService } from "@/lib/api/auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Zap,
  Truck,
  Leaf,
  BarChart3,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("companyA@demo.ecotrack");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid company email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success) {
        router.push("/dashboard");
      } else {
        setErrorMessage(res.error || "Authentication failed. Please check your credentials.");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* ========================================================================= */}
      {/* LEFT PANEL: Environmental Illustration & 5 Carbon Cycle Satellites        */}
      {/* ========================================================================= */}
      <div className="relative md:w-1/2 lg:w-[48%] bg-gradient-to-b from-[#F0FDF4] via-[#DCFCE7]/40 to-[#14532D]/90 p-8 lg:p-14 flex flex-col justify-between overflow-hidden border-r border-[#E2E8E3]">
        {/* Background decorative curved landscape waves */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg
            className="absolute bottom-0 left-0 w-full h-72 text-[#166534]"
            viewBox="0 0 1440 320"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,181.3C672,181,768,203,864,208C960,213,1056,203,1152,186.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
          <svg
            className="absolute bottom-0 left-0 w-full h-56 text-[#15803D]"
            viewBox="0 0 1440 320"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,96L60,117.3C120,139,240,181,360,197.3C480,213,600,203,720,176C840,149,960,107,1080,106.7C1200,107,1320,149,1380,170.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
          </svg>
        </div>

        {/* Top brand header */}
        <div className="relative z-10 space-y-6">
          <Logo size="lg" showText={true} />

          <div className="space-y-3 max-w-md">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">
              Track your impact. <br />
              <span className="text-[#2E7D32]">Build a greener future.</span>
            </h2>
            <p className="text-sm lg:text-base text-[#4B5563] leading-relaxed">
              Understand your carbon footprint, monitor emissions, and take meaningful action toward a more sustainable business.
            </p>
          </div>
        </div>

        {/* Carbon Cycle Orbital Diagram */}
        <div className="relative z-10 my-8 flex items-center justify-center">
          <div className="relative w-72 h-72 lg:w-88 lg:h-88 flex items-center justify-center">
            {/* Outer dotted orbital ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2E7D32]/40 animate-[spin_60s_linear_infinite]" />
            {/* Inner orbital ring */}
            <div className="absolute inset-8 rounded-full border border-[#2E7D32]/30" />

            {/* Central Planet Globe */}
            <div className="relative z-20 w-36 h-36 lg:w-44 lg:h-44 rounded-full bg-gradient-to-tr from-[#2E7D32] to-[#4ADE80] shadow-xl flex items-center justify-center p-3 border-4 border-white/80">
              {/* Continent shapes simulation */}
              <div className="absolute inset-0 rounded-full overflow-hidden opacity-30 pointer-events-none">
                <div className="w-16 h-16 bg-[#14532D] rounded-full absolute -top-2 left-4 blur-xs" />
                <div className="w-20 h-14 bg-[#14532D] rounded-full absolute bottom-3 right-2 blur-xs" />
                <div className="w-12 h-10 bg-[#14532D] rounded-full absolute top-12 right-6 blur-xs" />
              </div>

              {/* CO2 Reduction Badge */}
              <div className="relative z-30 bg-[#166534] text-white px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/40">
                <span className="font-bold text-sm tracking-tight">CO₂</span>
                <span className="text-xs text-[#86EFAC] font-bold">↓</span>
              </div>
            </div>

            {/* Node 1: Facilities (Top-Left) */}
            <div className="absolute top-0 left-4 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#E2E8E3] flex items-center gap-2 text-left animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#111827]">Facilities</p>
                <p className="text-[9px] text-[#6B7280]">Track operations</p>
              </div>
            </div>

            {/* Node 2: Energy (Top-Right) */}
            <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#E2E8E3] flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#111827]">Energy</p>
                <p className="text-[9px] text-[#6B7280]">Monitor usage</p>
              </div>
            </div>

            {/* Node 3: Transportation (Right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#E2E8E3] flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#111827]">Transportation</p>
                <p className="text-[9px] text-[#6B7280]">Reduce footprint</p>
              </div>
            </div>

            {/* Node 4: Sustainability (Bottom-Right) */}
            <div className="absolute bottom-2 right-4 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#E2E8E3] flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#111827]">Sustainability</p>
                <p className="text-[9px] text-[#6B7280]">Create impact</p>
              </div>
            </div>

            {/* Node 5: Emissions Tracking (Bottom-Left) */}
            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#E2E8E3] flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#111827]">Emissions Tracking</p>
                <p className="text-[9px] text-[#6B7280]">See your progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botanical illustration corner leaves */}
        <div className="relative z-10 text-xs text-[#166534] font-medium flex items-center justify-between">
          <span>Enterprise Sustainability v2.4</span>
          <span>GHG Protocol Verified</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Sign In Form with Explicit Visual States                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-2 text-left">
            <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-[#6B7280]">
              Sign in to your EcoTrack account
            </p>
          </div>

          {/* Demo Auth Transparency Banner */}
          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>DEMO AUTHENTICATION:</strong> Local development mode. Production single sign-on / PostgreSQL auth will be provided by backend.
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-start gap-2.5 text-[#DC2626] animate-in fade-in">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#374151]">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2E8E3] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-xs outline-hidden focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#374151]">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2E8E3] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-xs outline-hidden focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#4B5563]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#2E7D32] focus:ring-[#2E7D32]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert("Please contact your organization administrator to reset your corporate single sign-on credentials.")
                }
                className="font-medium text-[#2E7D32] hover:text-[#1B5E20] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-bold tracking-wide py-3"
            >
              Sign In
            </Button>
          </form>

          {/* Footnote */}
          <div className="pt-4 border-t border-[#F3F4F6] text-center">
            <p className="text-xs text-[#6B7280]">
              Don&apos;t have an account?{" "}
              <span className="text-[#374151] font-medium">
                Contact your EcoTrack administrator.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
