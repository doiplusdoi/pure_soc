import { PrismaClient } from "@prisma/client";

export interface DatabaseClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

export interface DatabaseClientFactory<TClient extends DatabaseClient = DatabaseClient> {
  create(): TClient;
}

export const databaseSchemaPath = "packages/database/prisma/schema.prisma" as const;

export const createDatabaseClient = <TClient extends DatabaseClient>(
  factory: DatabaseClientFactory<TClient>
): TClient => factory.create();

export type PureSocPrismaClient = PrismaClient;

export class PrismaDatabaseClientFactory implements DatabaseClientFactory<PrismaClient> {
  create(): PrismaClient {
    return new PrismaClient();
  }
}

export const createPrismaClient = (): PrismaClient => new PrismaDatabaseClientFactory().create();
