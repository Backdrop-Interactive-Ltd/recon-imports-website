import type { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";
import { AdminAuthorizationError } from "./adminAuthorization";
import { hasAdminPermission } from "./adminPermissions";

export class AdminAccountSafetyError extends Error {}

// All admin-account mutations share this lock, including creations and promotions.
// READ COMMITTED takes fresh snapshots after a waiting transaction obtains the lock.
export async function withAdminAccountMutation<T>(
  actorId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`LOCK TABLE "AdminUser" IN SHARE ROW EXCLUSIVE MODE`;
    const actor = await transaction.adminUser.findUnique({
      where: { id: actorId }, select: { role: true, isActive: true },
    });
    if (!actor?.isActive || !hasAdminPermission(actor.role, "adminUsers.manage")) {
      throw new AdminAuthorizationError("FORBIDDEN");
    }
    const result = await operation(transaction);
    const remaining = await transaction.adminUser.count({ where: { isActive: true, role: "SUPER_ADMIN" } });
    if (remaining < 1) {
      throw new AdminAccountSafetyError("At least one active SUPER_ADMIN must remain.");
    }
    return result;
  }, { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 10000 });
}
