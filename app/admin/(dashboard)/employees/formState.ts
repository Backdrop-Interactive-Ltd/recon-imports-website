export type EmployeeActionState = { status: "idle" | "success" | "error"; message: string; code?: string; employeeCode?: string };
export const initialEmployeeActionState: EmployeeActionState = { status: "idle", message: "" };
