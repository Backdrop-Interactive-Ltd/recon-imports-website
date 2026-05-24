import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { AdminRole } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import styles from "../brands/page.module.css";
import AdminUserForm from "./AdminUserForm";
import AdminUserRowActions from "./AdminUserRowActions";
import { formatAdminRole } from "./formOptions";

export const metadata = {
  title: "Admin Users | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function getCurrentAdminId() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const currentAdminId = (session.user as { id?: string }).id;

  if (!currentAdminId) {
    redirect("/admin/login");
  }

  return currentAdminId;
}

async function getAdminUsers() {
  const users = await prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      createdAt: true,
      email: true,
      id: true,
      isActive: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  });

  return users.map((user) => ({
    ...user,
    createdAtLabel: dateFormatter.format(user.createdAt),
    roleLabel: formatAdminRole(user.role),
    updatedAtLabel: dateFormatter.format(user.updatedAt),
  }));
}

export default async function AdminUsersPage() {
  const [currentAdminId, users] = await Promise.all([getCurrentAdminId(), getAdminUsers()]);
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;
  const superAdmins = users.filter((user) => user.role === AdminRole.SUPER_ADMIN).length;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Access</p>
          <h1>Admin Users</h1>
          <span>Manage admin panel users, roles, account status, and secure password resets.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Admins</span>
          <strong>{users.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeUsers}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveUsers}</strong>
        </div>
        <div>
          <span>Super Admins</span>
          <strong>{superAdmins}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Add Admin</p>
            <h2>Create a new admin user</h2>
          </div>
          <AdminUserForm mode="create" />
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Admin List</p>
              <h2>Database admin users</h2>
            </div>
            <span>{users.length} total</span>
          </div>

          {users.length > 0 ? (
            <div className={styles.brandList}>
              {users.map((user) => {
                const isCurrentUser = user.id === currentAdminId;

                return (
                  <article className={styles.brandCard} key={user.id}>
                    <div className={styles.brandTopline}>
                      <div className={styles.brandIdentity}>
                        <span className={styles.logoBox}>{getInitials(user.name) || "AD"}</span>
                        <div>
                          <h3>{user.name}</h3>
                          <p>{user.email}</p>
                        </div>
                      </div>
                      <span className={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                      <div>
                        <dt>Role</dt>
                        <dd>{user.roleLabel}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{user.createdAtLabel}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{user.updatedAtLabel}</dd>
                      </div>
                      <div>
                        <dt>Current</dt>
                        <dd>{isCurrentUser ? "Yes" : "No"}</dd>
                      </div>
                    </dl>

                    <details className={styles.editDetails}>
                      <summary>Edit admin user</summary>
                      <AdminUserForm
                        mode="edit"
                        user={{
                          email: user.email,
                          id: user.id,
                          isActive: user.isActive,
                          name: user.name,
                          role: user.role,
                        }}
                      />
                    </details>

                    <AdminUserRowActions
                      email={user.email}
                      isActive={user.isActive}
                      isCurrentUser={isCurrentUser}
                      userId={user.id}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No admin users yet</strong>
              <p>Create the first admin user from the form on this page.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
