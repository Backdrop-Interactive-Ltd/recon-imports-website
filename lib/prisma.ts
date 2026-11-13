import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { getWorkersDatabaseContext } from "./runtime/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(connectionString = process.env.DATABASE_URL, workers = false) {

  if (!connectionString) {
    throw new Error("DATABASE_URL is required before using Prisma.");
  }

  const adapter = new PrismaPg({
    connectionString,
    ...(workers ? { maxUses: 1, max: 5, connectionTimeoutMillis: 10_000 } : {}),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

let client: PrismaClient | undefined;
const requestClients = new WeakMap<object, PrismaClient>();

function getPrismaClient() {
  const workers = getWorkersDatabaseContext();
  if (workers) {
    let requestClient = requestClients.get(workers.request);
    if (!requestClient) {
      requestClient = createPrismaClient(workers.connectionString, true);
      requestClients.set(workers.request, requestClient);
    }
    // Never share TCP handles between Worker requests. maxUses closes released
    // sockets; transactions retain their checked-out connection until completion.
    return requestClient;
  }
  client ??= globalForPrisma.prisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Initialize on access so public loaders can use their existing fallback content
// when no database is configured. Database operations still require DATABASE_URL.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getPrismaClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
