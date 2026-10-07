"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MarketplaceProject } from "@/types";
import {
  Award,
  MapPin,
  Layers,
  Calendar,
  Coins,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Info,
} from "lucide-react";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: (MarketplaceProject & { vintage?: string; registryRef?: string }) | null;
  onPurchaseClick?: (project: MarketplaceProject) => void;
  isAdmin?: boolean;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  project,
  onPurchaseClick,
  isAdmin = false,
}) => {
  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project.name}
      subtitle="Verified Carbon Offset Project Details"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Sample Data / Demo Disclosure Banner */}
        <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs text-[#166534]">
          <Info className="w-4 h-4 text-[#2E7D32] flex-shrink-0 mt-0.5" />
          <span>
            <strong>Demo Marketplace:</strong> Projects, prices, certifications, and inventory shown are sample data for system demonstration.
          </span>
        </div>

        {/* Project Header Banner & Image */}
        <div className="relative h-52 w-full rounded-2xl overflow-hidden bg-[#F3F4F6] border border-[#E2E8E3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.imageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src =
                "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=80";
            }}
          />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Badge
              variant={project.badge === "Gold Standard" ? "gold" : "success"}
              className="shadow-sm font-semibold"
              icon={<Award className="w-3.5 h-3.5" />}
            >
              {project.badge}
            </Badge>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#2E7D32]" />
              Price per Tonne
            </span>
            <p className="text-base font-extrabold text-[#111827] mt-1">
              ${project.pricePerTonne.toFixed(2)}
              <span className="text-xs font-normal text-[#6B7280]"> / tCO₂e</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
              Available Credits
            </span>
            <p className="text-base font-extrabold text-[#111827] mt-1">
              {project.availableTCO2e.toLocaleString()}
              <span className="text-xs font-normal text-[#6B7280]"> tCO₂e</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#2E7D32]" />
              Credit Vintage
            </span>
            <p className="text-base font-extrabold text-[#111827] mt-1">
              {project.vintage || "2024"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
              Standard ID
            </span>
            <p className="text-sm font-bold text-[#111827] mt-1 truncate" title={project.registryRef || project.standard}>
              {project.registryRef || project.standard}
            </p>
          </div>
        </div>

        {/* Project Description & Metadata */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8E3] space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#5F6B61]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              {project.location} ({project.country})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#6B7280]" />
              {project.type}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#6B7280]" />
              {project.standard}
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-1">
              About This Project
            </h4>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              {project.description}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5">
              Impact Tags & Co-Benefits
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Role Enforcement Notice */}
        {isAdmin && (
          <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center gap-2 text-xs text-[#92400E]">
            <AlertCircle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>
              <strong>Admin Mode:</strong> View-only access. Admins cannot retire or purchase carbon credits.
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E3]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {!isAdmin && onPurchaseClick && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Coins className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onPurchaseClick(project);
              }}
            >
              Purchase Credits
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
