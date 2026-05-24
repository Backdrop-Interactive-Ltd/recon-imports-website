"use client";

import { useActionState, useEffect, useState } from "react";
import type { AdminRole } from "../../../../lib/generated/prisma/enums";
import { createAdminUserAction, updateAdminUserAction } from "./actions";
import styles from "../brands/page.module.css";
import {
  adminUserRoleOptions,
  formatAdminRole,
  initialAdminUserActionState,
} from "./formOptions";

type EditableAdminUser = {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: AdminRole;
};

type AdminUserFormProps = {
  mode: "create" | "edit";
  user?: EditableAdminUser;
};

export default function AdminUserForm({ mode, user }: AdminUserFormProps) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createAdminUserAction : updateAdminUserAction,
    initialAdminUserActionState,
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>(user?.role ?? adminUserRoleOptions[1]);

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      setEmail("");
      setIsActive(true);
      setName("");
      setPassword("");
      setRole(adminUserRoleOptions[1]);
    }

    if (mode === "edit" && state.status === "success") {
      setPassword("");
    }
  }, [mode, state.status]);

  return (
    <form action={formAction} className={styles.brandForm}>
      {user ? <input name="id" type="hidden" value={user.id} /> : null}

      <label className={styles.field}>
        <span>Name</span>
        <input
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Admin Name"
          type="text"
          value={name}
        />
        {state.errors?.name ? <small>{state.errors.name}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Email</span>
        <input
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          type="email"
          value={email}
        />
        {state.errors?.email ? <small>{state.errors.email}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Role</span>
        <select name="role" onChange={(event) => setRole(event.target.value as AdminRole)} value={role}>
          {adminUserRoleOptions.map((option) => (
            <option key={option} value={option}>
              {formatAdminRole(option)}
            </option>
          ))}
        </select>
        {state.errors?.role ? <small>{state.errors.role}</small> : null}
      </label>

      <label className={styles.field}>
        <span>{mode === "create" ? "Password" : "New Password"}</span>
        <input
          autoComplete="new-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === "create" ? "Minimum 8 characters" : "Leave blank to keep current password"}
          type="password"
          value={password}
        />
        {state.errors?.password ? <small>{state.errors.password}</small> : null}
      </label>

      <label className={styles.checkField}>
        <input checked={isActive} name="isActive" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
        <span>Admin user is active</span>
      </label>
      {state.errors?.isActive ? <p className={styles.formError}>{state.errors.isActive}</p> : null}

      {state.errors?.form || state.errors?.id ? <p className={styles.formError}>{state.errors.form || state.errors.id}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Add Admin User" : "Save Changes"}
      </button>
    </form>
  );
}
