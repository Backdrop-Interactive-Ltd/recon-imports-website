import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { adminSeedEnvSchema } from "../lib/validations/auth";

async function main() {
  const env = adminSeedEnvSchema.parse(process.env);
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await prisma.adminUser.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {
      name: env.ADMIN_NAME,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${env.ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
