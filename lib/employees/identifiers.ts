import { randomBytes } from "node:crypto";

export function formatEmployeeCode(value: bigint): string {
  if (value < BigInt(101)) throw new RangeError("Official employee sequence starts at 101.");
  return `RI-EMP-${value.toString()}`;
}

export function generateVerificationKey(): string {
  return randomBytes(16).toString("hex");
}

export function isVerificationKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}

export function isEmployeeCode(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 32) return false;
  if (/^RCI-[0-9]{4,}$/.test(value)) return true; // Previously issued legacy codes remain valid.
  return /^RI-EMP-[1-9][0-9]*$/.test(value) && BigInt(value.slice(7)) >= BigInt(101);
}
