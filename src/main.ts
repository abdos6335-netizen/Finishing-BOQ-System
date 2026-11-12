import { calculateRoomQuantities, type RoomInput } from "./domain/quantity-engine";
import { createId, loadProjects, saveProjects, type ProjectRecord } from "./domain/project-store";
import "./style.css";

let projects = loadProjects();
let activeProjectId = projects[0]?.id ?? "";
let language: "ar" | "en" = "ar";

const copy = {
  ar: {
    brand: "FINISHING BOQ", subtitle: "نظام حصر كميات ومقايسات التشطيبات",
    projects: "المشروعات", newProject: "مشروع جديد", projectName: "اسم المشروع",
    type: "نوع المشروع", apartment: "شقة", villa: "فيلا", create: "إنشاء المشروع",
    room: "إضافة غرفة", roomName: "اسم الغرفة", length: "الطول (م)", width: "العرض (م)",
    height: "الارتفاع (م)", addRoom: "حفظ الغرفة", overview: "ملخص المشروع",
    floor: "مساحة الأرضيات", walls: "صافي الحوائط", ceiling: "مساحة الأسقف",
    gross: "إجمالي الحوائط", deductions: "خصم الفتحات", perimeter: "المحيط",
    rooms: "الغرف", empty: "ابدأ بإنشاء مشروع ثم أضف الغرف لعرض الحصر.",
    noRooms: "لا توجد غرف مضافة بعد.", verified: "اجتاز المراجعة الحسابية",
    review: "يحتاج مراجعة", export: "تصدير CSV", language: "English",
    disclaimer: "نسخة تأسيسية: لا تعتمد النتائج كمقايسة تنفيذية قبل مراجعة الأبعاد وقواعد الخصم ومصدر الرسومات.",
    faces: "عدد أوجه الحوائط", createError: "أدخل بيانات صحيحة."
  },
  en: {
    brand: "FINISHING BOQ", subtitle: "Finishing Quantity Survey & Cost Estimation",
    projects: "Projects", newProject: "New project", projectName: "Project name",
    type: "Project type", apartment: "Apartment", villa: "Villa", create: "Create project",
    room: "Add room", roomName: "Room name", length: "Length (m)", width: "Width (m)",
    height: "Height (m)", addRoom: "Save room", overview: "Project overview",
    floor: "Floor area", walls: "Net wall area", ceiling: "Ceiling area",
    gross: "Gross walls", deductions: "Opening deductions", perimeter: "Perimeter",
    rooms: "Rooms", empty: "Create a project, then add rooms to see the takeoff.",
    noRooms: "No rooms added yet.", verified: "Arithmetic checks passed",
    review: "Needs review", export: "Export CSV", language: "العربية",
    disclaimer: "Foundation build: do not use as an execution BOQ until dimensions, deduction rules, and drawing sources are reviewed.",
    faces: "Number of wall faces", createError: "Enter valid values."
  }
};

function t(key: keyof typeof copy.ar): string { return copy[language][key]; }
function el<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
function activeProject(): ProjectRecord | undefined { return projects.find(p => p.id === activeProjectId); }
function persist(): void { saveProjects(projects); render(); }

function render(): void {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  const project = activeProject();
  el<HTMLDivElement>("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">F</div><div><strong>${t("brand")}</strong><small>${t("subtitle")}</small></div></div>
        <div class="side-heading">${t("projects")}</div>
        <div class="project-list">${projects.map(p => `<button class="project-link ${p.id === activeProjectId ? "selected" : ""}" data-project="${p.id}">${escapeHtml(p.name)}</button>`).join("") || `<p class="muted">${t("empty")}</p>`}</div>
        <button class="outline full" id="new-project-toggle">＋ ${t("newProject")}</button>
        <div class="sidebar-bottom"><button class="language" id="language-toggle">${t("language")}</button><span>v0.1.0 · Preview build</span></div>
      </aside>
      <main class="main">
        <header class="topbar"><div><span class="eyebrow">QUANTITY SURVEYING</span><h1>${project ? escapeHtml(project.name) : t("brand")}</h1></div><span class="status">LOCAL PREVIEW</span></header>
        <section id="new-project-panel" class="panel form-panel hidden">
          <h2>${t("newProject")}</h2><form id="project-form" class="form-grid">
            <label>${t("projectName")}<input name="name" required maxlength="100" /></label>
            <label>${t("type")}<select name="type"><option value="apartment">${t("apartment")}</option><option value="villa">${t("villa")}</option></select></label>
            <button class="primary" type="submit">${t("create")}</button>
          </form>
        </section>
        ${project ? renderProject(project) : `<section class="welcome panel"><div class="welcome-icon">⌂</div><h2>${t("brand")}</h2><p>${t("empty")}</p><button class="primary" id="welcome-create">${t("newProject")}</button></section>`}
        <footer class="disclaimer">${t("disclaimer")}</footer>
      </main>
    </div>`;
  document.querySelectorAll<HTMLButtonElement>("[data-project]").forEach(button => button.addEventListener("click", () => { activeProjectId = button.dataset.project ?? ""; render(); }));
  el("#new-project-toggle").addEventListener("click", () => el("#new-project-panel").classList.toggle("hidden"));
  document.querySelector("#welcome-create")?.addEventListener("click", () => el("#new-project-panel").classList.remove("hidden"));
  el("#language-toggle").addEventListener("click", () => { language = language === "ar" ? "en" : "ar"; render(); });
  document.querySelector<HTMLFormElement>("#project-form")?.addEventListener("submit", createProject);
  document.querySelector<HTMLFormElement>("#room-form")?.addEventListener("submit", addRoom);
  document.querySelector<HTMLButtonElement>("#export-csv")?.addEventListener("click", exportCsv);
}

function renderProject(project: ProjectRecord): string {
  const results = project.rooms.map(room => ({ room, result: calculateRoomQuantities(room) }));
  const total = (key: "floorAreaM2" | "ceilingAreaM2" | "wallNetAreaM2" | "wallGrossAreaM2" | "openingDeductionM2" | "perimeterM") =>
    results.reduce((sum, row) => sum + row.result[key], 0);
  return `
    <section class="stats-grid">
      ${stat(t("floor"), total("floorAreaM2"), "m²", "01")}
      ${stat(t("walls"), total("wallNetAreaM2"), "m²", "02")}
      ${stat(t("ceiling"), total("ceilingAreaM2"), "m²", "03")}
      ${stat(t("perimeter"), total("perimeterM"), "m", "04")}
    </section>
    <section class="content-grid">
      <div class="panel"><div class="panel-head"><div><span class="eyebrow">TAKEOFF INPUT</span><h2>${t("room")}</h2></div></div>
        <form id="room-form" class="room-form">
          <label>${t("roomName")}<input name="name" required maxlength="80" placeholder="${language === "ar" ? "مثال: المطبخ" : "e.g. Kitchen"}" /></label>
          <div class="input-row"><label>${t("length")}<input name="length" type="number" min="0.01" step="0.01" required /></label><label>${t("width")}<input name="width" type="number" min="0.01" step="0.01" required /></label></div>
          <div class="input-row"><label>${t("height")}<input name="height" type="number" min="0.01" step="0.01" required /></label><label>${t("faces")}<input name="faces" type="number" min="1" max="4" step="1" value="4" required /></label></div>
          <p class="hint">${language === "ar" ? "يتم إنشاء أوجه الحوائط من أبعاد الغرفة. خصم الفتحات التفصيلي وإسناد كل فتحة لوجه محدد سيضاف في مرحلة إدارة الرسومات." : "Wall faces are provisionally derived from room dimensions. Per-opening assignment and drawing-linked deductions are part of the drawing workflow."}</p>
          <button class="primary" type="submit">${t("addRoom")}</button>
        </form>
      </div>
      <div class="panel"><div class="panel-head"><div><span class="eyebrow">PROJECT DATA</span><h2>${t("overview")}</h2></div><button class="outline" id="export-csv">${t("export")}</button></div>
        <div class="mini-metrics"><div><span>${t("gross")}</span><strong>${total("wallGrossAreaM2").toFixed(2)} m²</strong></div><div><span>${t("deductions")}</span><strong>${total("openingDeductionM2").toFixed(2)} m²</strong></div></div>
        <div class="room-list"><h3>${t("rooms")} · ${project.rooms.length}</h3>${results.length ? results.map(({room,result}) => `<div class="room-row"><div><strong>${escapeHtml(room.name)}</strong><small>${room.lengthM} × ${room.widthM} × ${room.heightM} m</small></div><div class="room-values"><strong>${result.floorAreaM2.toFixed(2)} m²</strong><small class="${result.verification === "matched" ? "good" : "warn"}">${result.verification === "matched" ? t("verified") : t("review")}</small></div></div>`).join("") : `<p class="muted">${t("noRooms")}</p>`}</div>
      </div>
    </section>`;
}
function stat(label: string, value: number, unit: string, index: string): string {
  return `<article class="stat-card"><span class="stat-index">${index}</span><span class="stat-label">${label}</span><strong>${value.toFixed(2)} <small>${unit}</small></strong></article>`;
}
function createProject(event: SubmitEvent): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const name = String(data.get("name") ?? "").trim();
  if (!name) return;
  const project: ProjectRecord = { id: createId(), name, projectType: String(data.get("type") ?? "apartment"), createdAt: new Date().toISOString(), rooms: [] };
  projects = [...projects, project]; activeProjectId = project.id; persist();
}
function addRoom(event: SubmitEvent): void {
  event.preventDefault();
  const project = activeProject(); if (!project) return;
  const data = new FormData(event.currentTarget as HTMLFormElement);
  const name = String(data.get("name") ?? "").trim();
  const lengthM = Number(data.get("length")), widthM = Number(data.get("width")), heightM = Number(data.get("height"));
  const faces = Number(data.get("faces"));
  if (!name || ![lengthM,widthM,heightM].every(n => Number.isFinite(n) && n > 0) || !Number.isInteger(faces) || faces < 1 || faces > 4) return;
  const wallFaces: RoomInput["wallFaces"] = [];
  const pairs = [[lengthM,heightM],[widthM,heightM],[lengthM,heightM],[widthM,heightM]];
  for (let i=0;i<faces;i++) wallFaces.push({ id: `face-${i+1}`, lengthM: pairs[i][0], heightM: pairs[i][1], openings: [] });
  const room: RoomInput = { id: createId(), name, lengthM, widthM, heightM, wallFaces };
  // Validate before persisting.
  calculateRoomQuantities(room);
  project.rooms.push(room); persist();
}
function exportCsv(): void {
  const project = activeProject(); if (!project) return;
  const rows = [["Room","Floor m2","Ceiling m2","Gross walls m2","Opening deductions m2","Net walls m2","Perimeter m","Verification"]];
  for (const room of project.rooms) {
    const r = calculateRoomQuantities(room);
    rows.push([room.name,r.floorAreaM2,r.ceilingAreaM2,r.wallGrossAreaM2,r.openingDeductionM2,r.wallNetAreaM2,r.perimeterM,r.verification].map(String));
  }
  const csv = "\uFEFF" + rows.map(row => row.map(value => `"${value.replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href=url; a.download=`${project.name.replace(/[^\p{L}\p{N}-]+/gu,"-")}-takeoff.csv`; a.click(); URL.revokeObjectURL(url);
}

render();
