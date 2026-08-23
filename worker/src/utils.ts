// Utility helpers
export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function jsonErr(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

/**
 * Compute volumetric weight: (L × B × H) / 5000
 * Dimensions in cm, result in kg.
 */
export function volumetricWeight(l: number, b: number, h: number): number {
  return (l * b * h) / 5000;
}

/**
 * Billable weight = MAX(actual, volumetric)
 */
export function billableWeight(actualKg: number, volKg: number): number {
  return Math.max(actualKg, volKg);
}

/**
 * Calculate shipping cost from a rate card and billable weight.
 * charge = base_rate + max(0, billable_weight - base_weight) * per_kg_rate + cod_surcharge_if_applicable
 */
export function calculateCharge(
  baseRate: number,
  perKgRate: number,
  baseWeightKg: number,
  billableKg: number,
  codSurcharge: number,
  isCod: boolean
): { base_charge: number; weight_charge: number; cod_charge: number; total_charge: number } {
  const base_charge = baseRate;
  const extraKg = Math.max(0, billableKg - baseWeightKg);
  const weight_charge = +(extraKg * perKgRate).toFixed(2);
  const cod_charge = isCod ? codSurcharge : 0;
  const total_charge = +(base_charge + weight_charge + cod_charge).toFixed(2);
  return { base_charge, weight_charge, cod_charge, total_charge };
}
