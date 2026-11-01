export function validateEmissionInput(input: {
  consumption: number;
  unit: string;
  facility: string;
  reportingPeriod: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.consumption || isNaN(input.consumption) || input.consumption <= 0) {
    errors.consumption = "Please enter a valid positive consumption amount.";
  }

  if (!input.unit || input.unit.trim().length === 0) {
    errors.unit = "Measurement unit is required.";
  }

  if (!input.facility || input.facility.trim().length === 0) {
    errors.facility = "Facility / Location name is required.";
  }

  if (!input.reportingPeriod || input.reportingPeriod.trim().length === 0) {
    errors.reportingPeriod = "Reporting period is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
