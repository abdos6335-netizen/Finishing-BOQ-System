import { deepEqual } from "./numeric";

/**
 * Three-way merge for records edited on more than one device.
 *
 * Rules:
 *  - A field changed on only one side is taken from that side.
 *  - A field changed identically on both sides is taken once.
 *  - A field changed differently on both sides is a conflict. Conflicts are
 *    never resolved silently: engineering and financial fields (protected
 *    fields) always require an explicit human choice; other fields use the
 *    caller's strategy, which defaults to requiring a choice as well.
 *  - Delete versus edit is a conflict, never an automatic delete.
 */
export type ConflictStrategy = "manual" | "latest-wins";

export interface MergeOptions {
  /** Fields whose conflicts must always be resolved by a person. */
  protectedFields: string[];
  /** Strategy for conflicts on non-protected fields. */
  strategy?: ConflictStrategy;
  /** Timestamps (ISO) used only by the "latest-wins" strategy on non-protected fields. */
  localUpdatedAt?: string;
  remoteUpdatedAt?: string;
}

export interface FieldConflict {
  field: string;
  base: unknown;
  local: unknown;
  remote: unknown;
  protected: boolean;
}

export interface MergeResult<T> {
  status: "merged" | "conflict";
  merged: T;
  conflicts: FieldConflict[];
  /** Fields that were auto-resolved by the latest-wins strategy (audit trail). */
  autoResolved: string[];
}

export function threeWayMerge<T extends Record<string, unknown>>(base: T, local: T, remote: T, options: MergeOptions): MergeResult<T> {
  const protectedSet = new Set(options.protectedFields);
  const strategy = options.strategy ?? "manual";
  const fields = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  const merged: Record<string, unknown> = {};
  const conflicts: FieldConflict[] = [];
  const autoResolved: string[] = [];

  for (const field of [...fields].sort()) {
    const b = base[field];
    const l = local[field];
    const r = remote[field];
    if (deepEqual(l, r)) { if (l !== undefined) merged[field] = l; continue; }
    if (deepEqual(l, b)) { if (r !== undefined) merged[field] = r; continue; }
    if (deepEqual(r, b)) { if (l !== undefined) merged[field] = l; continue; }

    const isProtected = protectedSet.has(field);
    const canAutoResolve = !isProtected && strategy === "latest-wins" &&
      options.localUpdatedAt !== undefined && options.remoteUpdatedAt !== undefined &&
      options.localUpdatedAt !== options.remoteUpdatedAt;
    if (canAutoResolve) {
      const winner = options.localUpdatedAt! > options.remoteUpdatedAt! ? l : r;
      if (winner !== undefined) merged[field] = winner;
      autoResolved.push(field);
      continue;
    }
    // Unresolved: keep the local value in the working copy so nothing is lost,
    // and report the conflict.
    if (l !== undefined) merged[field] = l;
    conflicts.push({ field, base: b, local: l, remote: r, protected: isProtected });
  }
  return { status: conflicts.length === 0 ? "merged" : "conflict", merged: merged as T, conflicts, autoResolved };
}

export type ConflictChoice = "local" | "remote";

/** Applies explicit human choices. Every conflict must be answered. */
export function resolveConflicts<T extends Record<string, unknown>>(result: MergeResult<T>, choices: Record<string, ConflictChoice>): T {
  const merged: Record<string, unknown> = { ...result.merged };
  for (const conflict of result.conflicts) {
    const choice = choices[conflict.field];
    if (choice !== "local" && choice !== "remote") throw new Error(`A choice (local or remote) is required for conflicting field "${conflict.field}".`);
    const value = choice === "local" ? conflict.local : conflict.remote;
    if (value === undefined) delete merged[conflict.field]; else merged[conflict.field] = value;
  }
  return merged as T;
}

export interface KeyedRecord { id: string; }

export interface CollectionConflict<T> {
  id: string;
  kind: "edit-edit" | "delete-edit" | "edit-delete" | "add-add";
  fieldConflicts: FieldConflict[];
  local: T | null;
  remote: T | null;
}

export interface CollectionMergeResult<T> {
  status: "merged" | "conflict";
  merged: T[];
  conflicts: Array<CollectionConflict<T>>;
  added: string[];
  removed: string[];
}

/** Merges two edited copies of a record list (e.g. BOQ items) against their common ancestor. */
export function mergeCollections<T extends KeyedRecord & Record<string, unknown>>(
  base: T[], local: T[], remote: T[], options: MergeOptions
): CollectionMergeResult<T> {
  const index = (list: T[]): Map<string, T> => new Map(list.map(item => [item.id, item]));
  const B = index(base), L = index(local), R = index(remote);
  const ids = [...new Set([...B.keys(), ...L.keys(), ...R.keys()])].sort();
  const merged: T[] = [];
  const conflicts: Array<CollectionConflict<T>> = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const id of ids) {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    if (b === undefined) {
      if (l && r) {
        if (deepEqual(l, r)) { merged.push(l); added.push(id); }
        else { merged.push(l); conflicts.push({ id, kind: "add-add", fieldConflicts: [], local: l, remote: r }); }
      } else { merged.push((l ?? r)!); added.push(id); }
      continue;
    }
    if (!l && !r) { removed.push(id); continue; }
    if (!l) {
      if (deepEqual(r, b)) removed.push(id);
      else { merged.push(r!); conflicts.push({ id, kind: "delete-edit", fieldConflicts: [], local: null, remote: r! }); }
      continue;
    }
    if (!r) {
      if (deepEqual(l, b)) removed.push(id);
      else { merged.push(l); conflicts.push({ id, kind: "edit-delete", fieldConflicts: [], local: l, remote: null }); }
      continue;
    }
    const result = threeWayMerge(b, l, r, options);
    merged.push(result.merged);
    if (result.status === "conflict") conflicts.push({ id, kind: "edit-edit", fieldConflicts: result.conflicts, local: l, remote: r });
  }
  return { status: conflicts.length === 0 ? "merged" : "conflict", merged, conflicts, added, removed };
}
