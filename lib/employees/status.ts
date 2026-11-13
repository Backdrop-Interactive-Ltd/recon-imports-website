export type EmployeeBusinessStatus = "ACTIVE" | "INACTIVE" | "RESIGNED";

export function getEmployeeBusinessStatus(status: "ACTIVE" | "INACTIVE" | "FORMER"): EmployeeBusinessStatus {
  return status === "FORMER" ? "RESIGNED" : status;
}

export function getEmployeeDatabaseStatus(status: EmployeeBusinessStatus | "FORMER"): "ACTIVE" | "INACTIVE" | "FORMER" {
  return status === "RESIGNED" ? "FORMER" : status;
}
