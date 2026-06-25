import type {
  ProductV1RecordType,
  ProductV1Repository,
  ProductV1RepositoryListFilter,
  ProductV1RepositorySaveMetadata
} from "./service";

interface ProductV1StateRecordRow {
  id: string;
  recordType: string;
  organizationId?: string | null;
  partitionKey?: string | null;
  idempotencyKey?: string | null;
  recordJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type DelegateArgs = Record<string, unknown>;

interface ProductV1StateRecordDelegate {
  create(args: DelegateArgs): Promise<ProductV1StateRecordRow>;
  findFirst(args: DelegateArgs): Promise<ProductV1StateRecordRow | null>;
  findMany(args?: DelegateArgs): Promise<ProductV1StateRecordRow[]>;
  findUnique(args: DelegateArgs): Promise<ProductV1StateRecordRow | null>;
  update(args: DelegateArgs): Promise<ProductV1StateRecordRow>;
}

export interface ProductV1PrismaClient {
  productV1StateRecord: ProductV1StateRecordDelegate;
}

export class PrismaProductV1Repository implements ProductV1Repository {
  constructor(private readonly client: ProductV1PrismaClient) {}

  async get<T>(recordType: ProductV1RecordType, id: string): Promise<T | null> {
    const row = await this.client.productV1StateRecord.findUnique({
      where: { id }
    });
    if (!row || row.recordType !== recordType) {
      return null;
    }
    return recordFromRow<T>(row);
  }

  async list<T>(recordType: ProductV1RecordType, filter: ProductV1RepositoryListFilter = {}): Promise<T[]> {
    const rows = await this.client.productV1StateRecord.findMany({
      where: {
        recordType,
        ...(filter.organizationId !== undefined ? { organizationId: filter.organizationId } : {}),
        ...(filter.partitionKey !== undefined ? { partitionKey: filter.partitionKey } : {})
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    return rows.map(recordFromRow<T>);
  }

  async upsert<T extends { id: string }>(
    recordType: ProductV1RecordType,
    record: T,
    metadata: ProductV1RepositorySaveMetadata = {}
  ): Promise<T> {
    const existing = await this.client.productV1StateRecord.findUnique({
      where: { id: record.id }
    });
    const data = {
      recordType,
      organizationId: metadata.organizationId ?? null,
      partitionKey: metadata.partitionKey ?? null,
      idempotencyKey: metadata.idempotencyKey ?? null,
      recordJson: record,
      updatedAt: new Date()
    };
    const row = existing
      ? await this.client.productV1StateRecord.update({
          where: { id: record.id },
          data
        })
      : await this.client.productV1StateRecord.create({
          data: {
            id: record.id,
            ...data,
            createdAt: new Date()
          }
        });
    return recordFromRow<T>(row);
  }

  async findByIdempotencyKey<T>(
    recordType: ProductV1RecordType,
    organizationId: string | null,
    idempotencyKey: string
  ): Promise<T | null> {
    const row = await this.client.productV1StateRecord.findFirst({
      where: {
        recordType,
        organizationId,
        idempotencyKey
      }
    });
    return row ? recordFromRow<T>(row) : null;
  }
}

const recordFromRow = <T>(row: ProductV1StateRecordRow): T => JSON.parse(JSON.stringify(row.recordJson)) as T;
