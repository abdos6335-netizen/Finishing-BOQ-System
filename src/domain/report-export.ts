import type { BoqItemInput } from "./boq-engine";
import { calculateProjectCost, type CostAdjustment, type ProjectCostSummary } from "./cost-engine";
import { calculateRoomQuantities, type QuantityResult, type RoomInput } from "./quantity-engine";
import { calculateRevisedTotals, type RevisedTotals, type VariationOrder } from "./variation-orders";

/**
 * Report model plus two renderers: a standalone HTML report (print it to PDF
 * from the browser) and a dependency-free .xlsx writer. Every quantity row
 * carries its source reference, and every figure comes from the engines — the
 * renderers never recompute or round anything themselves.
 */
export type ReportLocale = "ar" | "en";

export interface ReportInput {
  projectName: string;
  buildingCondition: string;
  generatedAt: string;
  currency: string;
  rooms: RoomInput[];
  items: BoqItemInput[];
  adjustments: CostAdjustment[];
  variations?: VariationOrder[];
  /** Extra review notes (e.g. from the dimension audit) to print in the report. */
  reviewNotes?: string[];
}

export interface ReportModel {
  input: Pick<ReportInput, "projectName" | "buildingCondition" | "generatedAt" | "currency">;
  cost: ProjectCostSummary;
  rooms: QuantityResult[];
  revised: RevisedTotals | null;
  reviewNotes: string[];
}

export function buildReportModel(input: ReportInput): ReportModel {
  const cost = calculateProjectCost(input.items, input.adjustments, input.currency);
  const rooms = input.rooms.map(calculateRoomQuantities);
  const revised = input.variations && input.variations.length > 0 ? calculateRevisedTotals(cost.grandTotal, input.variations) : null;
  const notes = [...cost.checks, ...(input.reviewNotes ?? [])];
  for (const room of rooms) for (const check of room.checks) notes.push(`${room.roomName}: ${check}`);
  for (const item of cost.items) for (const check of item.checks) notes.push(`${item.code}: ${check}`);
  return {
    input: { projectName: input.projectName, buildingCondition: input.buildingCondition, generatedAt: input.generatedAt, currency: input.currency },
    cost, rooms, revised, reviewNotes: notes
  };
}

const LABELS = {
  en: {
    title: "Bill of Quantities & Cost Report", project: "Project", condition: "Building condition", generated: "Generated", currency: "Currency",
    boq: "Bill of Quantities", code: "Code", description: "Description", unit: "Unit", net: "Net qty", waste: "Waste %", order: "Order qty",
    rate: "Unit rate", total: "Line total", source: "Quantity source", wasteRef: "Waste approval", rateRef: "Rate source", status: "Status",
    verified: "Verified", review: "Needs review", unpriced: "Not priced", adjustments: "Adjustments", label: "Label", base: "Base", amount: "Amount", approval: "Approval ref",
    direct: "Direct subtotal", adjTotal: "Adjustments total", grand: "Grand total", rooms: "Measured rooms", room: "Room", floor: "Floor m²", ceiling: "Ceiling m²",
    wallGross: "Wall gross m²", deductions: "Deductions m²", wallNet: "Wall net m²", perimeter: "Perimeter m", checks: "Review notes", none: "None",
    variations: "Variation orders", baseTotal: "Base total", approvedVar: "Approved variations", revised: "Revised total", pendingVar: "Pending (submitted)",
    incomplete: "This report is INCOMPLETE: some items are unpriced or need review.", complete: "All items are priced and verified.",
    assumptions: "No waste, price, or deduction is applied unless an approval or source reference is recorded on the line."
  },
  ar: {
    title: "تقرير حصر الكميات والتكاليف", project: "المشروع", condition: "حالة المبنى", generated: "تاريخ الإصدار", currency: "العملة",
    boq: "المقايسة", code: "الكود", description: "البند", unit: "الوحدة", net: "الكمية الصافية", waste: "الهالك %", order: "كمية الطلب",
    rate: "سعر الوحدة", total: "إجمالي البند", source: "مصدر الكمية", wasteRef: "اعتماد الهالك", rateRef: "مصدر السعر", status: "الحالة",
    verified: "مراجَع", review: "يحتاج مراجعة", unpriced: "غير مسعّر", adjustments: "الإضافات", label: "البند", base: "الأساس", amount: "القيمة", approval: "مرجع الاعتماد",
    direct: "إجمالي التكلفة المباشرة", adjTotal: "إجمالي الإضافات", grand: "الإجمالي النهائي", rooms: "الغرف المقاسة", room: "الغرفة", floor: "الأرضية م²", ceiling: "السقف م²",
    wallGross: "الحوائط الإجمالية م²", deductions: "الخصومات م²", wallNet: "الحوائط الصافية م²", perimeter: "المحيط م", checks: "ملاحظات المراجعة", none: "لا يوجد",
    variations: "الأعمال الإضافية", baseTotal: "الإجمالي الأساسي", approvedVar: "الأعمال الإضافية المعتمدة", revised: "الإجمالي المعدّل", pendingVar: "قيد الاعتماد",
    incomplete: "هذا التقرير غير مكتمل: توجد بنود غير مسعّرة أو تحتاج مراجعة.", complete: "كل البنود مسعّرة ومراجَعة.",
    assumptions: "لا يتم تطبيق هالك أو سعر أو خصم إلا إذا كان له مرجع اعتماد أو مصدر مسجّل على البند."
  }
} as const;

type Cell = string | number | null;

interface Table { name: string; header: string[]; rows: Cell[][]; }

function statusText(locale: ReportLocale, status: string, priced: boolean): string {
  const t = LABELS[locale];
  if (status !== "verified") return t.review;
  return priced ? t.verified : t.unpriced;
}

function tables(model: ReportModel, locale: ReportLocale): Table[] {
  const t = LABELS[locale];
  const boq: Table = {
    name: t.boq,
    header: [t.code, t.description, t.unit, t.net, t.waste, t.order, t.rate, t.total, t.source, t.wasteRef, t.rateRef, t.status],
    rows: model.cost.items.map(i => [i.code, i.description, i.unit, i.netQuantity, i.wasteRatePct, i.orderQuantity, i.unitRate, i.lineTotal, i.sourceRef, i.wasteApprovalRef, i.rateSourceRef, statusText(locale, i.status, i.lineTotal !== null)])
  };
  const adjustments: Table = {
    name: t.adjustments,
    header: [t.label, t.base, t.amount, t.approval],
    rows: [
      ...model.cost.adjustments.map(a => [a.label, a.ratePct === null ? "—" : `${a.ratePct}% ${a.base}`, a.amount, a.approvalRef] as Cell[]),
      [t.direct, null, model.cost.directSubtotal, null], [t.adjTotal, null, model.cost.adjustmentsTotal, null], [t.grand, null, model.cost.grandTotal, null]
    ]
  };
  const rooms: Table = {
    name: t.rooms,
    header: [t.room, t.floor, t.ceiling, t.wallGross, t.deductions, t.wallNet, t.perimeter, t.status],
    rows: model.rooms.map(r => [r.roomName, r.floorAreaM2, r.ceilingAreaM2, r.wallGrossAreaM2, r.openingDeductionM2, r.wallNetAreaM2, r.perimeterM, r.verification === "matched" ? t.verified : t.review])
  };
  const checks: Table = {
    name: t.checks,
    header: [t.checks],
    rows: (model.reviewNotes.length ? model.reviewNotes : [t.none]).map(n => [n])
  };
  const result = [boq, adjustments, rooms];
  if (model.revised) {
    result.push({
      name: t.variations, header: [t.label, t.amount],
      rows: [[t.baseTotal, model.revised.baseTotal], [t.approvedVar, model.revised.approvedVariationsTotal], [t.revised, model.revised.revisedTotal], [t.pendingVar, model.revised.pendingVariationsTotal]]
    });
  }
  result.push(checks);
  return result;
}

// ---------------------------------------------------------------- HTML ----

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmt(cell: Cell): string {
  if (cell === null) return "";
  return typeof cell === "number" ? String(cell) : esc(cell);
}

export function renderReportHtml(model: ReportModel, locale: ReportLocale): string {
  const t = LABELS[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const sections = tables(model, locale).map(table =>
    `<h2>${esc(table.name)}</h2><table><thead><tr>${table.header.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
    table.rows.map(row => `<tr>${row.map(c => `<td${typeof c === "number" ? ' class="n"' : ""}>${fmt(c)}</td>`).join("")}</tr>`).join("") +
    "</tbody></table>").join("\n");
  const banner = model.cost.complete ? `<p class="ok">${esc(t.complete)}</p>` : `<p class="warn">${esc(t.incomplete)}</p>`;
  return `<!doctype html>
<html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(model.input.projectName)} — ${esc(t.title)}</title>
<style>
body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px}
table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top}
th{background:#eee}td.n{text-align:end;font-variant-numeric:tabular-nums}
.meta{color:#444;font-size:12px}.ok{color:#116611}.warn{color:#9a3300;font-weight:600}
@media print{body{margin:10mm}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<h1>${esc(t.title)}</h1>
<div class="meta">${esc(t.project)}: ${esc(model.input.projectName)} · ${esc(t.condition)}: ${esc(model.input.buildingCondition)} · ${esc(t.currency)}: ${esc(model.input.currency)} · ${esc(t.generated)}: ${esc(model.input.generatedAt)}</div>
${banner}<p class="meta">${esc(t.assumptions)}</p>
${sections}
</body></html>`;
}

// ---------------------------------------------------------------- XLSX ----

const encoder = new TextEncoder();

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal ZIP writer using the "stored" method (no compression). */
export function zipStored(files: Array<{ name: string; data: Uint8Array }>): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(name.length), ...u16(0), ...name]);
    chunks.push(local, file.data);
    central.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]));
    offset += local.length + file.data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(new ArrayBuffer(all.reduce((s, c) => s + c.length, 0)));
  let pos = 0;
  for (const part of all) { out.set(part, pos); pos += part.length; }
  return out;
}

function xmlEsc(value: string): string {
  // Strip characters that are illegal in XML 1.0, then escape markup characters.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnName(index: number): string {
  let n = index + 1, name = "";
  while (n > 0) { const r = (n - 1) % 26; name = String.fromCharCode(65 + r) + name; n = Math.floor((n - 1) / 26); }
  return name;
}

function sheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base, i = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 28)} ${i++}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function sheetXml(table: Table, rtl: boolean): string {
  const rowXml = (cells: Cell[], rowIndex: number, header: boolean): string => {
    const cs = cells.map((cell, c) => {
      const ref = `${columnName(c)}${rowIndex}`;
      if (cell === null) return "";
      if (typeof cell === "number") {
        if (!Number.isFinite(cell)) throw new Error("Cannot export a non-finite number.");
        return `<c r="${ref}" s="${header ? 1 : 2}"><v>${cell}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr" s="${header ? 1 : 0}"><is><t xml:space="preserve">${xmlEsc(cell)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex}">${cs}</row>`;
  };
  const rows = [rowXml(table.header, 1, true), ...table.rows.map((row, i) => rowXml(row, i + 2, false))].join("");
  const widths = table.header.map((_, c) => `<col min="${c + 1}" max="${c + 1}" width="${c === 1 || c === 8 ? 40 : 16}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ""}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${rows}</sheetData></worksheet>`;
}

export function buildXlsx(model: ReportModel, locale: ReportLocale): Uint8Array<ArrayBuffer> {
  const all = tables(model, locale);
  const used = new Set<string>();
  const names = all.map(table => sheetName(table.name, used));
  const files: Array<{ name: string; data: Uint8Array }> = [];
  const add = (name: string, text: string): void => { files.push({ name, data: encoder.encode(text) }); };
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  add("[Content_Types].xml", `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${all.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  add("_rels/.rels", `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  add("xl/workbook.xml", `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  add("xl/_rels/workbook.xml.rels", `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${all.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${all.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add("xl/styles.xml", `${head}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00##"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  all.forEach((table, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(table, locale === "ar")));
  return zipStored(files);
}

/** Reads back the stored entries of an archive produced by zipStored (used by tests and integrity checks). */
export function readStoredZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const out = new Map<string, string>();
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Not a ZIP archive.");
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error("Corrupt central directory.");
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const data = bytes.subarray(start, start + size);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}.`);
    out.set(name, decoder.decode(data));
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
