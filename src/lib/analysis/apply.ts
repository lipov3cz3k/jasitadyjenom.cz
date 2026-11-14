import type { OffenseId } from "../notice/offenses";
import type { Analysis } from "./schema";

export interface VehicleForm {
  plate: string;
  vehicle: string;
  offense: OffenseId | "";
  details: string;
}

export type VehicleField = keyof VehicleForm;

export const emptyVehicleForm: VehicleForm = { plate: "", vehicle: "", offense: "", details: "" };

export const vehicleFieldLabels: Record<VehicleField, string> = {
  plate: "registrační značku",
  vehicle: "popis vozidla",
  offense: "druh přestupku",
  details: "popis přestupku",
};

export interface Applied {
  form: VehicleForm;
  /** Fields whose current value comes from the AI and the user hasn't touched yet. */
  suggested: Set<VehicleField>;
  changed: VehicleField[];
}

/**
 * Fills in the AI suggestion. A field the user filled in themselves is never overwritten;
 * an earlier, untouched suggestion is replaced by the new one.
 */
export function applyAnalysis(form: VehicleForm, suggested: ReadonlySet<VehicleField>, analysis: Analysis): Applied {
  const next = { ...form };
  const nextSuggested = new Set(suggested);
  const changed: VehicleField[] = [];

  const proposals: { [K in VehicleField]: VehicleForm[K] | null } = {
    plate: analysis.plate,
    vehicle: analysis.vehicle,
    offense: analysis.offense,
    details: analysis.details,
  };

  for (const field of Object.keys(proposals) as VehicleField[]) {
    const value = proposals[field];
    const writable = !form[field].trim() || suggested.has(field);
    if (value === null || !writable) continue;
    if (value !== form[field]) changed.push(field);
    (next as Record<VehicleField, string>)[field] = value;
    nextSuggested.add(field);
  }

  return { form: next, suggested: nextSuggested, changed };
}
