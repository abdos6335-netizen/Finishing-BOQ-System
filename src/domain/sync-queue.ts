/**
 * Offline-first synchronization queue.
 *
 * Every local change becomes an operation with a unique idempotency key (opId).
 * Operations are replayed in order; a server that has already applied an opId
 * answers "duplicate", which counts as success, so re-sending after a dropped
 * connection can never double-apply a change. Conflicts stop the queue for that
 * entity until a person resolves them (see conflict-resolution.ts).
 *
 * The transport is an interface: this module contains no network code.
 */
export type OperationKind = "upsert" | "delete";

export interface SyncOperation {
  opId: string;
  entity: string;
  entityId: string;
  kind: OperationKind;
  payload: Record<string, unknown> | null;
  /** Server revision this change was based on (0 for a new record). */
  baseRevision: number;
  deviceId: string;
  createdAt: string;
  attempts: number;
  status: "pending" | "conflict" | "failed";
  lastError?: string;
}

export type PushOutcome =
  | { status: "applied"; revision: number }
  | { status: "duplicate"; revision: number }
  | { status: "conflict"; revision: number; remote: Record<string, unknown> | null };

export interface RemoteChange {
  entity: string;
  entityId: string;
  revision: number;
  deleted: boolean;
  payload: Record<string, unknown> | null;
  deviceId: string;
}

export interface SyncTransport {
  push(op: SyncOperation): Promise<PushOutcome>;
  pull(sinceCursor: number): Promise<{ changes: RemoteChange[]; cursor: number }>;
}

/** Thrown by a transport when the network is unreachable; the queue stays intact. */
export class OfflineError extends Error {
  constructor(message = "Network unavailable.") { super(message); this.name = "OfflineError"; }
}

export interface QueueStore {
  load(): Promise<SyncOperation[]>;
  save(ops: SyncOperation[]): Promise<void>;
}

export class MemoryQueueStore implements QueueStore {
  private data = "[]";
  async load(): Promise<SyncOperation[]> { return JSON.parse(this.data) as SyncOperation[]; }
  async save(ops: SyncOperation[]): Promise<void> { this.data = JSON.stringify(ops); }
}

export interface FlushReport {
  applied: number;
  duplicates: number;
  conflicts: Array<{ opId: string; entity: string; entityId: string; remote: Record<string, unknown> | null }>;
  failed: string[];
  offline: boolean;
  remaining: number;
}

export interface EnqueueInput {
  entity: string;
  entityId: string;
  kind: OperationKind;
  payload: Record<string, unknown> | null;
  baseRevision: number;
}

export class OfflineQueue {
  constructor(
    private readonly store: QueueStore,
    private readonly deviceId: string,
    private readonly newOpId: () => string,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly maxAttempts = 5
  ) {
    if (!deviceId.trim()) throw new Error("Device id is required.");
  }

  async pending(): Promise<SyncOperation[]> { return this.store.load(); }

  /**
   * Adds a change. Consecutive unsent upserts of the same record are coalesced
   * into one (the latest payload wins, the original base revision is kept) so a
   * long offline session does not replay every keystroke.
   */
  async enqueue(input: EnqueueInput): Promise<SyncOperation> {
    if (!input.entity.trim() || !input.entityId.trim()) throw new Error("Entity and entity id are required.");
    if (input.kind === "upsert" && input.payload === null) throw new Error("An upsert needs a payload.");
    const ops = await this.store.load();
    const last = [...ops].reverse().find(op => op.entity === input.entity && op.entityId === input.entityId);
    if (last && last.status === "pending" && last.attempts === 0 && last.kind === "upsert" && input.kind === "upsert") {
      last.payload = input.payload;
      last.createdAt = this.now();
      await this.store.save(ops);
      return last;
    }
    const op: SyncOperation = {
      opId: this.newOpId(), entity: input.entity, entityId: input.entityId, kind: input.kind,
      payload: input.payload, baseRevision: input.baseRevision, deviceId: this.deviceId,
      createdAt: this.now(), attempts: 0, status: "pending"
    };
    ops.push(op);
    await this.store.save(ops);
    return op;
  }

  /** Sends pending operations in order. Stops at the first offline error and keeps everything unsent. */
  async flush(transport: SyncTransport): Promise<FlushReport> {
    const ops = await this.store.load();
    const report: FlushReport = { applied: 0, duplicates: 0, conflicts: [], failed: [], offline: false, remaining: 0 };
    const blockedEntities = new Set<string>();
    const kept: SyncOperation[] = [];

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const key = `${op.entity}:${op.entityId}`;
      if (op.status === "failed" || op.status === "conflict" || blockedEntities.has(key)) { kept.push(op); continue; }
      if (report.offline) { kept.push(op); continue; }
      try {
        op.attempts += 1;
        const outcome = await transport.push(op);
        if (outcome.status === "applied" || outcome.status === "duplicate") {
          if (outcome.status === "applied") report.applied += 1; else report.duplicates += 1;
          // Later unsent changes to the same record are now based on the revision just written.
          for (const later of ops.slice(i + 1)) {
            if (later.entity === op.entity && later.entityId === op.entityId && later.status === "pending") later.baseRevision = outcome.revision;
          }
        } else {
          op.status = "conflict";
          blockedEntities.add(key);
          report.conflicts.push({ opId: op.opId, entity: op.entity, entityId: op.entityId, remote: outcome.remote });
          kept.push(op);
        }
      } catch (error) {
        if (error instanceof OfflineError) {
          op.attempts -= 1; // a connectivity failure is not an attempt at the operation itself
          report.offline = true;
          kept.push(op);
        } else {
          op.lastError = error instanceof Error ? error.message : String(error);
          if (op.attempts >= this.maxAttempts) { op.status = "failed"; report.failed.push(op.opId); }
          kept.push(op);
          blockedEntities.add(key);
        }
      }
    }
    await this.store.save(kept);
    report.remaining = kept.length;
    return report;
  }

  /** Removes a conflicted operation after the user resolved it, optionally replacing it with a new base. */
  async resolveConflict(opId: string, resolvedPayload: Record<string, unknown> | null, newBaseRevision: number): Promise<void> {
    const ops = await this.store.load();
    const op = ops.find(item => item.opId === opId);
    if (!op || op.status !== "conflict") throw new Error(`No conflicted operation with id ${opId}.`);
    op.payload = resolvedPayload;
    op.kind = resolvedPayload === null ? "delete" : "upsert";
    op.baseRevision = newBaseRevision;
    op.status = "pending";
    op.attempts = 0;
    await this.store.save(ops);
  }
}

/** In-memory reference server used by tests and demos; mirrors the transport contract. */
export class InMemorySyncServer {
  private revision = 0;
  private readonly records = new Map<string, { revision: number; payload: Record<string, unknown> | null; deleted: boolean; deviceId: string }>();
  private readonly log: RemoteChange[] = [];
  private readonly seenOps = new Map<string, PushOutcome>();
  online = true;

  transport(): SyncTransport {
    return {
      push: async op => this.push(op),
      pull: async since => this.pull(since)
    };
  }

  private push(op: SyncOperation): PushOutcome {
    if (!this.online) throw new OfflineError();
    const previous = this.seenOps.get(op.opId);
    if (previous) return { status: "duplicate", revision: previous.revision };
    const key = `${op.entity}:${op.entityId}`;
    const current = this.records.get(key);
    const currentRevision = current?.revision ?? 0;
    if (current && currentRevision !== op.baseRevision) {
      return { status: "conflict", revision: currentRevision, remote: current.payload };
    }
    this.revision += 1;
    const deleted = op.kind === "delete";
    this.records.set(key, { revision: this.revision, payload: deleted ? null : op.payload, deleted, deviceId: op.deviceId });
    this.log.push({ entity: op.entity, entityId: op.entityId, revision: this.revision, deleted, payload: deleted ? null : op.payload, deviceId: op.deviceId });
    const outcome: PushOutcome = { status: "applied", revision: this.revision };
    this.seenOps.set(op.opId, outcome);
    return outcome;
  }

  private pull(since: number): { changes: RemoteChange[]; cursor: number } {
    if (!this.online) throw new OfflineError();
    return { changes: this.log.filter(change => change.revision > since), cursor: this.revision };
  }

  recordCount(): number { return [...this.records.values()].filter(r => !r.deleted).length; }
}
