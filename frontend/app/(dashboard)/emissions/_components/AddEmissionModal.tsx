"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmissionCategory, ScopeType } from "@/types";
import { validateEmissionInput } from "@/lib/validation/calculationEngine";
import { CheckCircle2, Calculator, AlertCircle } from "lucide-react";

interface AddEmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCalculating?: boolean;
  serverError?: string | null;
  onProceedToReview: (data: {
    category: EmissionCategory;
    scope: ScopeType;
    consumption: number;
    unit: string;
    reportingPeriod: string;
    facility: string;
  }) => void;
}

export const AddEmissionModal: React.FC<AddEmissionModalProps> = ({
  isOpen,
  onClose,
  isCalculating = false,
  serverError = null,
  onProceedToReview,
}) => {
  const [category, setCategory] = useState<EmissionCategory>("Purchased Electricity");
  const [consumptionStr, setConsumptionStr] = useState("1000.00");
  const [unit, setUnit] = useState("kWh");
  const [reportingPeriod, setReportingPeriod] = useState("August 2026");
  const [facility, setFacility] = useState("Headquarters Building A");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-map scope by category
  const getScopeByCategory = (cat: EmissionCategory): ScopeType => {
    switch (cat) {
      case "Purchased Electricity":
        return "Scope 2";
      case "Fleet & Fuel":
      case "Facilities":
        return "Scope 1";
      default:
        return "Scope 3";
    }
  };

  const handleCategoryChange = (val: string) => {
    const cat = val as EmissionCategory;
    setCategory(cat);
    // Auto-update default unit
    if (cat === "Purchased Electricity") setUnit("kWh");
    else if (cat === "Fleet & Fuel") setUnit("L");
    else if (cat === "Business Travel") setUnit("passenger-km");
    else if (cat === "Purchased Goods") setUnit("tons");
    else if (cat === "Logistics & Freight") setUnit("shipments");
    else if (cat === "Facilities") setUnit("m³");
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const consumptionNum = parseFloat(consumptionStr.replace(/,/g, ""));
    const validation = validateEmissionInput({
      consumption: consumptionNum,
      unit,
      facility,
      reportingPeriod,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onProceedToReview({
      category,
      scope: getScopeByCategory(category),
      consumption: consumptionNum,
      unit,
      reportingPeriod,
      facility,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Emissions Data"
      subtitle="Log corporate activity data for GHG Protocol carbon conversion"
      maxWidth="lg"
    >
      <form onSubmit={handleCalculate} className="space-y-4" noValidate>
        {serverError && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-2.5 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Category & Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Activity Category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={isCalculating}
            options={[
              { value: "Purchased Electricity", label: "⚡ Electricity (Scope 2)" },
              { value: "Fleet & Fuel", label: "🚚 Fleet & Fuel (Scope 1)" },
              { value: "Facilities", label: "🏢 Facilities Gas (Scope 1)" },
              { value: "Business Travel", label: "✈️ Business Travel (Scope 3)" },
              { value: "Purchased Goods", label: "📦 Purchased Goods (Scope 3)" },
              { value: "Logistics & Freight", label: "🚢 Logistics & Freight (Scope 3)" },
              { value: "Other", label: "🌱 Other Activity" },
            ]}
          />

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Assigned GHG Scope
            </label>
            <div className="px-3.5 py-2 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB] text-sm font-semibold text-[#2E7D32]">
              {getScopeByCategory(category)}
            </div>
          </div>
        </div>

        {/* Consumption & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Consumption / Value"
            id="emission-consumption-input"
            value={consumptionStr}
            onChange={(e) => setConsumptionStr(e.target.value)}
            placeholder="e.g. 1000.00"
            errorMessage={errors.consumption}
            helperText="Raw consumption volume"
            disabled={isCalculating}
            required
            aria-required="true"
          />

          <Input
            label="Measurement Unit"
            id="emission-unit-input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. kWh, L, kg"
            errorMessage={errors.unit}
            helperText="Recognized activity unit"
            disabled={isCalculating}
            required
            aria-required="true"
          />
        </div>

        {/* Facility & Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Facility / Entity"
            id="emission-facility-input"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            placeholder="e.g. Headquarters Building A"
            errorMessage={errors.facility}
            disabled={isCalculating}
            required
            aria-required="true"
          />

          <Input
            label="Reporting Period"
            id="emission-period-input"
            value={reportingPeriod}
            onChange={(e) => setReportingPeriod(e.target.value)}
            placeholder="e.g. August 2026"
            errorMessage={errors.reportingPeriod}
            disabled={isCalculating}
            required
            aria-required="true"
          />
        </div>

        {/* Validation indicator banner */}
        <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2.5 text-xs text-[#166534] font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
          <span>✓ Inputs valid according to GHG Protocol Scope standards</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8E3]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCalculating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isCalculating}
            disabled={isCalculating}
            leftIcon={<Calculator className="w-4 h-4" />}
          >
            Calculate & Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};
