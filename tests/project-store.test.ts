import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProjects, saveProjects, type ProjectRecord } from "../src/domain/project-store";

const STORAGE_KEY = "finishing-boq.projects.v1";
const project: ProjectRecord = {
  id: "p-1",
  name: "Apartment 01",
  projectType: "apartment",
  buildingCondition: "renovation",
  createdAt: "2026-11-12T10:00:00.000Z",
  rooms: [],
  boqItems: []
};

function mockStorage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(STORAGE_KEY, initial);
  const getItem = vi.fn((key: string) => values.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => values.set(key, value));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem, setItem }
  });
  return { getItem, setItem, values };
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("project storage and legacy migration", () => {
  it("round-trips project records including building condition", () => {
    const storage = mockStorage();
    saveProjects([project]);
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([project]));
    expect(loadProjects()).toEqual([project]);
  });

  it("migrates older projects without a building condition to unspecified", () => {
    mockStorage(JSON.stringify([{
      id: "legacy", name: "Old project", projectType: "villa",
      createdAt: "2025-01-01T00:00:00.000Z", rooms: []
    }]));
    expect(loadProjects()).toEqual([{
      id: "legacy", name: "Old project", projectType: "villa",
      buildingCondition: "unspecified",
      createdAt: "2025-01-01T00:00:00.000Z", rooms: [], boqItems: []
    }]);
  });

  it("does not crash on malformed JSON or non-array storage", () => {
    mockStorage("{not-json");
    expect(loadProjects()).toEqual([]);
    mockStorage(JSON.stringify({ id: "not-an-array" }));
    expect(loadProjects()).toEqual([]);
  });

  it("ignores invalid project records instead of casting them as valid", () => {
    mockStorage(JSON.stringify([{ id: 1, name: "bad", rooms: [] }]));
    expect(loadProjects()).toEqual([]);
  });

  it("does not infer an unknown building condition", () => {
    mockStorage(JSON.stringify([{
      ...project, buildingCondition: "some-unknown-condition"
    }]));
    expect(loadProjects()[0].buildingCondition).toBe("unspecified");
  });
});
