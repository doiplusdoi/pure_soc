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

