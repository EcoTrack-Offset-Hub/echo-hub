"use client";

import React, { useState } from "react";
import { MarketplaceProject } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Heart, MapPin, Layers, Award } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ProjectCardProps {
  project: MarketplaceProject;
  onSelectProject?: (project: MarketplaceProject) => void;
  onPurchase?: (project: MarketplaceProject) => void;
  onToggleSave?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelectProject,
  onPurchase,
  onToggleSave,
}) => {
  const [isSaved, setIsSaved] = useState(project.isSaved || false);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    if (onToggleSave) onToggleSave(project.id);
  };

  const handleAction = () => {
    if (onPurchase) {
      onPurchase(project);
    } else if (onSelectProject) {
      onSelectProject(project);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E3] overflow-hidden shadow-xs hover:shadow-md hover:border-[#CBD5E1] transition-all flex flex-col justify-between group">
      {/* Top Banner Image with Badges */}
      <div className="relative h-44 w-full bg-[#F3F4F6] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.imageUrl}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Verification Standard Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant={project.badge === "Gold Standard" ? "gold" : "success"}
            className="shadow-sm font-semibold"
            icon={<Award className="w-3.5 h-3.5" />}
          >
            {project.badge}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="text-base font-bold text-[#111827] group-hover:text-[#2E7D32] transition-colors line-clamp-1">
            {project.name}
          </h3>

          {/* Location & Metadata Line */}
          <div className="flex items-center gap-3 text-xs text-[#5F6B61]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              {project.location}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#6B7280]" />
              {project.type}
            </span>
          </div>

          {/* Project Summary */}
          <p className="text-xs text-[#5F6B61] line-clamp-2 leading-relaxed">
            {project.description}
          </p>

          {/* Tag Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {project.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Purchase Action Bar */}
        <div className="pt-3 border-t border-[#F3F4F6] space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-extrabold text-[#111827]">
                ${project.pricePerTonne.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#5F6B61] ml-1">/ tCO₂e</span>
            </div>

            <span className="text-[11px] text-[#6B7280]">
              {project.availableTCO2e.toLocaleString()} available
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAction}
              className="flex-1 text-xs font-semibold py-2"
            >
              View Project
            </Button>

            <button
              onClick={handleHeartClick}
              aria-label={isSaved ? "Remove from saved" : "Save project"}
              className={cn(
                "p-2 rounded-lg border border-[#E2E8E3] hover:bg-[#F9FAFB] transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium",
                isSaved ? "text-[#DC2626] border-[#FECACA] bg-[#FEF2F2]" : "text-[#6B7280]"
              )}
            >
              <Heart
                className={cn("w-4 h-4", isSaved ? "fill-current text-[#DC2626]" : "")}
              />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
