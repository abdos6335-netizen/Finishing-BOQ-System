import { beforeEach, describe, expect, it } from "vitest";
import { addActivity, addManualActivity, addRate, buildSchedulePlan, emptySchedule, removeAnyActivity, removeRate, scheduleView, setCalendar, setRounding } from "../src/domain/project-schedule";
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
    expect(view.status).toBe("incomplete");
    expect(view.cpm).toBeNull();
  });
  it("takes quantity from the BOQ line and builds the critical path with dates", () => {
    const p = project();
    p.schedule = addRate(emptySchedule(), rate, "r1");
    p.schedule = addActivity(p, act, "a1");
    p.schedule = addActivity(p, { ...act, name: "Walls", boqItemId: "i2", predecessorIds: ["a1"] }, "a2");
    expect(p.schedule.activities[0].quantity).toBe(50);
    const view = scheduleView(p);
    expect(view.cpm!.projectDurationDays).toBe(6);
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
    expect(() => removeAnyActivity(p, "a1")).toThrow();
    expect(() => removeRate(p.schedule!, "r1")).toThrow();
    expect(() => setRounding(p.schedule!, "floor")).toThrow();
    p.schedule = removeAnyActivity(p, "a2").schedule;
    expect(p.schedule.activities).toHaveLength(1);
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

const a=(id:string,durationDays:number,predecessors:Array<{id:string;type:"FS"|"SS"|"FF";lagDays:number}>=[])=>({id,name:id,durationDays,durationSourceRef:`approved programme ${id}`,predecessors});
describe("sourced project schedule",()=>{it("calculates duration and critical activities",()=>{const r=buildSchedulePlan([a("A",3),a("B",4,[{id:"A",type:"FS",lagDays:0}]),a("C",2,[{id:"A",type:"FS",lagDays:0}])]);expect(r.status).toBe("complete");expect(r.cpm?.projectDurationDays).toBe(7);expect(r.cpm?.criticalActivityIds).toEqual(["A","B"]);});it("rejects missing sources and invalid dependencies",()=>{expect(()=>buildSchedulePlan([{...a("A",2),durationSourceRef:" "}])).toThrow();expect(()=>buildSchedulePlan([a("A",2,[{id:"missing",type:"FS",lagDays:0}])])).toThrow();expect(()=>buildSchedulePlan([a("A",2,[{id:"A",type:"FS",lagDays:0}])])).toThrow();});it("does not invent an empty schedule",()=>expect(buildSchedulePlan([]).status).toBe("incomplete"));});

describe("mixed schedule (rate-based and sourced-duration activities)", () => {
  it("calculates one critical path across both kinds and keeps manual data on removal", () => {
    const p = project();
    p.schedule = addRate(emptySchedule(), rate, "r1");
    p.schedule = addActivity(p, act, "a1"); // 50 m2 / 25 = 2 days
    p.scheduleActivities = addManualActivity(p, { name: "Handover prep", durationDays: "3", durationSourceRef: "Approved programme", predecessorIds: ["a1"], relationship: "FS", lagDays: "" }, "m1");
    const view = scheduleView(p);
    expect(view.status).toBe("complete");
    expect(view.cpm!.projectDurationDays).toBe(5);
    expect(view.cpm!.criticalActivityIds).toEqual(["a1", "m1"]);
    expect(view.rows.map(r => r.kind)).toEqual(["rate", "manual"]);
    expect(() => removeAnyActivity(p, "a1")).toThrow();
    const removed = removeAnyActivity(p, "m1");
    expect(removed.scheduleActivities).toEqual([]);
  });
  it("rejects a sourced activity without a source or with an unknown predecessor", () => {
    const p = project();
    const base = { name: "X", durationDays: "2", durationSourceRef: "Prog", predecessorIds: [] as string[], relationship: "FS", lagDays: "" };
    expect(() => addManualActivity(p, { ...base, durationSourceRef: " " }, "m1")).toThrow();
    expect(() => addManualActivity(p, { ...base, predecessorIds: ["ghost"] }, "m1")).toThrow();
    expect(() => addManualActivity(p, { ...base, durationDays: "-1" }, "m1")).toThrow();
  });
  it("blocks the path while a rate-based activity has no rate", () => {
    const p = project();
    p.schedule = addActivity(p, { ...act, rateId: "" }, "a1");
    p.scheduleActivities = addManualActivity(p, { name: "X", durationDays: "2", durationSourceRef: "Prog", predecessorIds: [], relationship: "FS", lagDays: "" }, "m1");
    expect(scheduleView(p).cpm).toBeNull();
  });
});
