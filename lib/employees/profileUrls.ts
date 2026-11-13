import { siteUrl } from "../seo";
import { isEmployeeCode } from "./identifiers";

export function getEmployeeProfilePath(employeeCode: string): string {
  if (!isEmployeeCode(employeeCode)) throw new TypeError("Invalid employee code.");
  return `/team/${encodeURIComponent(employeeCode)}`;
}

export function getEmployeeProfileUrl(employeeCode: string): string {
  return new URL(getEmployeeProfilePath(employeeCode), siteUrl).toString();
}
