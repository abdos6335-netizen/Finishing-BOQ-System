import { beforeEach, describe, expect, it } from "vitest";
import { addActivity, addRate, emptySchedule, removeActivity, removeRate, scheduleView, setCalendar, setRounding } from "../src/domain/project-schedule";
import { loadProjects, saveProjects, type ProjectRecord } from "../src/domain/project-store";

class FakeLocalStorage {
  private readonly data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage(); });

const project = (over: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "p", name: "P", projectType: "apartment", buildingCondition: "plaster-only", createdAt: "2026-11-01T00:00:00.000Z", rooms: [],
  boqItems: [{ id: "i1", code: "F", description: "Floor", unit: "m2", netQuantity: 50, sourceRef: "room:a" }, { id: "i2", code: "W", description: "Walls", unit: "m2", netQuantity: 100, sourceRef: "room:b" }], ...over
});
const rate = { unit: "m2", basis: "per-crew-day", value: "25", sourceRef: "Site record", sourceDate: "2026-10-01", location: "Cairo", confidence: "" };
const act = { name: "Floor", boqItemId: "i1", rateId: "r1", crewSize: "", predecessorIds: [] as string[], relationship: "FS", lagDays: "" };

describe("schedule", () => {
  it("requires a sourced rate and refuses to guess durations", () => {
    expect(() => addRate(emptySchedule(), { ...rate, sourceRef: "" }, "r1")).toThrow();
    expect(() => addRate(emptySchedule(), { ...rate, location: "" }, "r1")).toThrow();
    const p = project();
    p.schedule = addActivity(p, { ...act, rateId: "" }, "a1");
    const view = scheduleView(p);
    expect(view.estimate.status).toBe("incomplete");
    expect(view.estimate.cpm).toBeNull();
  });
  it("takes quantity from the BOQ line and builds the critical path with dates", () => {
    const p = project();
    p.schedule = addRate(emptySchedule(), rate, "r1");
    p.schedule = addActivity(p, act, "a1");
    p.schedule = addActivity(p, { ...act, name: "Walls", boqItemId: "i2", predecessorIds: ["a1"] }, "a2");
    expect(p.schedule.activities[0].quantity).toBe(50);
    const view = scheduleView(p);
    expect(view.estimate.cpm!.projectDurationDays).toBe(6);
    expect(view.projectFinish).toBeNull();
    p.schedule = setCalendar(p.schedule, { startDate: "2026-11-15", weekdays: [0, 1, 2, 3, 4], holidays: "" });
    const dated = scheduleView(p);
    expect(dated.dates.get("a1")).toEqual({ start: "2026-11-15", finish: "2026-11-16" });
    expect(dated.projectFinish).toBe("2026-11-22");
  });
  it("rejects bad calendars, unknown predecessors and unsafe removals", () => {
    const p = project();
    p.schedule = addRate(emptySchedule(), rate, "r1");
    expect(() => setCalendar(p.schedule!, { startDate: "2026-02-31", weekdays: [0], holidays: "" })).toThrow();
    expect(() => setCalendar(p.schedule!, { startDate: "2026-11-15", weekdays: [], holidays: "" })).toThrow();
    expect(() => addActivity(p, { ...act, predecessorIds: ["ghost"] }, "a1")).toThrow();
    expect(() => addActivity(p, { ...act, boqItemId: "nope" }, "a1")).toThrow();
    p.schedule = addActivity(p, act, "a1");
    p.schedule = addActivity(p, { ...act, predecessorIds: ["a1"] }, "a2");
    expect(() => removeActivity(p.schedule!, "a1")).toThrow();
    expect(() => removeRate(p.schedule!, "r1")).toThrow();
    expect(() => setRounding(p.schedule!, "floor")).toThrow();
    expect(removeActivity(p.schedule, "a2").activities).toHaveLength(1);
  });
  it("round-trips through the store and drops a malformed schedule", () => {
    const p = project();
    p.schedule = addRate(emptySchedule(), rate, "r1");
    saveProjects([p]);
    expect(loadProjects()[0].schedule?.rates).toHaveLength(1);
    localStorage.setItem("finishing-boq.projects.v1", JSON.stringify([{ ...project({ id: "bad" }), schedule: { rounding: "x", rates: [], activities: [] } }, project({ id: "ok" })]));
    expect(loadProjects().map(x => x.id)).toEqual(["ok"]);
  });
});
