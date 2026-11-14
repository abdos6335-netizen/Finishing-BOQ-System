import { calculateRoomQuantities, type QuantityResult, type RoomInput } from "./quantity-engine";
import { requireText, round } from "./numeric";

/** Client → project → building → floor → unit → room → zone → element. */
export type HierarchyType = "client" | "project" | "building" | "floor" | "unit" | "room" | "zone" | "element";

export interface HierarchyNode {
  id: string;
  type: HierarchyType;
  name: string;
  parentId: string | null;
  /** For type "room": id of the measured RoomInput. */
  roomId?: string;
}

const ALLOWED_PARENTS: Record<HierarchyType, Array<HierarchyType | null>> = {
  client: [null],
  project: ["client", null],
  building: ["project"],
  floor: ["building"],
  unit: ["floor", "building"],
  room: ["unit", "floor"],
  zone: ["room"],
  element: ["room", "zone"]
};

export function validateHierarchy(nodes: HierarchyNode[], rooms: RoomInput[] = []): string[] {
  const problems: string[] = [];
  const byId = new Map<string, HierarchyNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) problems.push(`Duplicate hierarchy id: ${node.id}.`);
    byId.set(node.id, node);
  }
  const roomIds = new Set(rooms.map(room => room.id));
  for (const node of nodes) {
    if (!node.name.trim()) problems.push(`Node ${node.id} has no name.`);
    const parent = node.parentId === null ? null : byId.get(node.parentId);
    if (node.parentId !== null && !parent) { problems.push(`Node ${node.id} has unknown parent ${node.parentId}.`); continue; }
    const parentType = parent ? parent.type : null;
    if (!ALLOWED_PARENTS[node.type].includes(parentType)) problems.push(`A ${node.type} cannot sit under ${parentType ?? "the root"} (${node.id}).`);
    if (node.type === "room") {
      if (!node.roomId) problems.push(`Room node ${node.id} has no measured room reference.`);
      else if (rooms.length > 0 && !roomIds.has(node.roomId)) problems.push(`Room node ${node.id} references missing room ${node.roomId}.`);
    }
    const seen = new Set<string>([node.id]);
    let cursor = parent;
    while (cursor) {
      if (seen.has(cursor.id)) { problems.push(`Cycle detected at ${node.id}.`); break; }
      seen.add(cursor.id);
      cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
    }
  }
  return problems;
}

export function pathOf(nodes: HierarchyNode[], id: string): HierarchyNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const path: HierarchyNode[] = [];
  let cursor = byId.get(id);
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
  }
  return path;
}

export function descendantsOf(nodes: HierarchyNode[], id: string): HierarchyNode[] {
  const result: HierarchyNode[] = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const node of nodes) if (node.parentId === current) { result.push(node); stack.push(node.id); }
  }
  return result;
}

export interface QuantityRollup {
  nodeId: string;
  name: string;
  type: HierarchyType;
  roomCount: number;
  floorAreaM2: number;
  ceilingAreaM2: number;
  wallNetAreaM2: number;
  needsReviewRooms: number;
}

/** Sums room quantities for each non-room node; the roll-up uses the same engine results, never re-derived values. */
export function rollupQuantities(nodes: HierarchyNode[], rooms: RoomInput[]): QuantityRollup[] {
  const results = new Map<string, QuantityResult>(rooms.map(room => [room.id, calculateRoomQuantities(room)]));
  return nodes.filter(node => node.type !== "room" && node.type !== "zone" && node.type !== "element").map(node => {
    const roomNodes = descendantsOf(nodes, node.id).filter(item => item.type === "room" && item.roomId && results.has(item.roomId));
    let floor = 0, ceiling = 0, wall = 0, review = 0;
    for (const roomNode of roomNodes) {
      const r = results.get(roomNode.roomId!)!;
      floor += r.floorAreaM2; ceiling += r.ceilingAreaM2; wall += r.wallNetAreaM2;
      if (r.verification === "needs-review") review += 1;
    }
    return {
      nodeId: node.id, name: node.name, type: node.type, roomCount: roomNodes.length,
      floorAreaM2: round(floor), ceilingAreaM2: round(ceiling), wallNetAreaM2: round(wall), needsReviewRooms: review
    };
  });
}

export function addNode(nodes: HierarchyNode[], node: HierarchyNode, rooms: RoomInput[] = []): HierarchyNode[] {
  requireText(node.id, "Node id");
  requireText(node.name, "Node name");
  const next = [...nodes, node];
  const problems = validateHierarchy(next, rooms);
  if (problems.length) throw new Error(problems[0]);
  return next;
}
