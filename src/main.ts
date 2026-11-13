import { calculateRoomQuantities, type RoomInput } from "./domain/quantity-engine";
import { calculateBoq, calculateBoqItem, type BoqItemInput, type BoqUnit } from "./domain/boq-engine";
import { createId, loadProjects, saveProjects, type BuildingCondition, type ProjectRecord } from "./domain/project-store";
import { generateRoomBoqItems } from "./domain/room-boq-link";
import { IndexedDbProjectStorage, migrateFromLocalStorage, type ProjectStorage } from "./domain/storage";
import { buildReportModel, buildXlsx, renderReportHtml } from "./domain/report-export";
import { addVariationItem, adjustmentsOf, buildAdjustment, buildVariationItem, canDeleteVariation, createVariation, nextVariationNumber, projectFinancials, removeVariationItem, variationsOf } from "./domain/project-costing";
import { calculateVariation, transitionVariation, type VariationOrder, type VariationStatus } from "./domain/variation-orders";
import "./style.css";

let projects: ProjectRecord[] = [];
let activeProjectId = "";
let storage: ProjectStorage | null = null;
let language: "ar" | "en" = "ar";
const copy = {
  ar: {
    brand:"FINISHING BOQ",subtitle:"نظام حصر كميات ومقايسات التشطيبات",projects:"المشروعات",newProject:"مشروع جديد",projectName:"اسم المشروع",
    type:"نوع المشروع",apartment:"شقة",villa:"فيلا",buildingCondition:"حالة المبنى",brick:"مبنى على الطوب الأحمر (بدون تشطيب)",renovation:"تجديد وإعادة تشطيب",plaster:"محارة فقط",semiFinished:"نصف تشطيب",fullyFinished:"متشطب بالكامل",alteration:"تعديل تقسيمات داخلية وهدم وبناء جديد",shell:"هيكل خرساني (Concrete Shell)",unspecified:"غير محددة / مشروع قديم",create:"إنشاء المشروع",room:"إضافة غرفة",roomName:"اسم الغرفة",length:"الطول (م)",width:"العرض (م)",
    height:"الارتفاع (م)",addRoom:"حفظ الغرفة",overview:"ملخص المشروع",floor:"مساحة الأرضيات",walls:"صافي الحوائط",ceiling:"مساحة الأسقف",
    gross:"إجمالي الحوائط",deductions:"خصم الفتحات",perimeter:"المحيط",rooms:"الغرف",empty:"ابدأ بإنشاء مشروع ثم أضف الغرف لعرض الحصر.",
    noRooms:"لا توجد غرف مضافة بعد.",verified:"اجتاز المراجعة الحسابية",review:"يحتاج مراجعة",export:"تصدير CSV",exportXlsx:"تصدير Excel",printReport:"تقرير PDF / طباعة",currencyPrompt:"أدخل عملة التقرير (مثال: EGP):",storageError:"تعذّر حفظ البيانات في قاعدة البيانات المحلية.",costing:"التكلفة والإضافات",currency:"عملة المشروع",currencyPlaceholder:"مثال: EGP",adjLabel:"اسم الإضافة",adjKind:"النوع",kTransport:"نقل",kEngineerFee:"أتعاب هندسية",kOverhead:"مصروفات عامة",kContingency:"احتياطي",kProfit:"ربح",kTax:"ضريبة",kOther:"أخرى",adjRate:"نسبة %",adjFixed:"مبلغ ثابت",adjBase:"أساس النسبة",baseDirect:"التكلفة المباشرة",baseCumulative:"التراكمي (شامل ما قبلها)",adjOrder:"الترتيب",adjApproval:"مرجع الاعتماد",adjVisible:"ظاهرة للعميل",addAdjustment:"إضافة",directSubtotal:"التكلفة المباشرة",adjustmentsTotal:"إجمالي الإضافات",grandTotal:"الإجمالي النهائي",costIncomplete:"الإجمالي غير مكتمل: توجد بنود غير مسعّرة أو تحتاج مراجعة.",costComplete:"كل البنود مسعّرة ومراجَعة.",adjHint:"كل إضافة تحتاج مرجع اعتماد. لا توجد نسب افتراضية: أدخل نسبة مع أساس صريح، أو مبلغًا ثابتًا، وليس الاثنين.",hiddenLabel:"مخفية عن العميل",noAdjustments:"لا توجد إضافات بعد.",currencyMissing:"لم تُدخل عملة بعد.",
variations:"الأعمال الإضافية (أوامر التغيير)",newVariation:"أمر تغيير جديد",voNumber:"الرقم",voTitle:"العنوان",voReason:"السبب",voBaseRevision:"إصدار المقايسة الأساسي",createVariation:"إنشاء الأمر",stDraft:"مسودة",stSubmitted:"مقدَّم",stApproved:"معتمد",stRejected:"مرفوض",voAddition:"إضافة",voOmission:"حذف من المقايسة",voDirection:"النوع",voSubmit:"تقديم",voApprove:"اعتماد",voReject:"رفض",voReopen:"إعادة لمسودة",voDelete:"حذف الأمر",voApprovalPrompt:"أدخل مرجع اعتماد الأمر:",voTotal:"صافي الأمر",voBaseTotal:"الإجمالي الأساسي",voApprovedTotal:"الأعمال المعتمدة",voRevisedTotal:"الإجمالي المعدّل",voPendingTotal:"قيد الاعتماد",voLocked:"لا يمكن تعديل البنود إلا في المسودة.",noVariations:"لا توجد أوامر تغيير.",voIncomplete:"أوامر بها بنود غير مسعّرة",voNoItems:"لا توجد بنود.",addVoItem:"إضافة بند",
language:"English",
    disclaimer:"نسخة تأسيسية: لا تعتمد النتائج كمقايسة تنفيذية قبل مراجعة الأبعاد وقواعد الخصم ومصدر الرسومات.",
    wallFace:"وجه حائط",addWallFace:"إضافة وجه حائط",faceLength:"طول الوجه (م)",faceHeight:"ارتفاع الوجه (م)",opening:"فتحة",addOpening:"إضافة فتحة",
    deduct:"تُخصم من المساحة",noFaces:"لم تُسجل أوجه حوائط مقاسة بعد.",remove:"حذف",measuredFaces:"أوجه الحوائط المقاسة",openings:"الفتحات",createError:"راجع القيم المدخلة.",boq:"بنود المقايسة",boqCode:"كود البند",boqDescription:"وصف البند",boqUnit:"الوحدة",boqQuantity:"الكمية الصافية",boqSource:"مرجع مصدر الكمية",wasteRate:"هالك معتمد %",wasteApproval:"مرجع اعتماد الهالك",unitRate:"سعر الوحدة",rateSource:"مرجع السعر",costBasis:"أساس التسعير",netBasis:"صافي الكمية",orderBasis:"كمية التوريد",addBoq:"إضافة بند",subtotal:"إجمالي البنود المسعرة",unpriced:"بنود بلا تسعير",lineTotal:"الإجمالي",removeItem:"حذف البند",boqStatus:"حالة المراجعة",addRoomTakeoff:"إضافة كميات الغرف للمقايسة",takeoffAdded:"تمت إضافة الكميات الجديدة",takeoffUpdated:"تم تحديث كميات مرتبطة بتغيّر القياسات",takeoffSkipped:"بنود لم تتغير",wallTakeoffReview:"حوائط تحتاج مراجعة",staleWallTakeoff:"بنود حوائط سابقة أصبحت غير محدثة وتحتاج مراجعة"
  },
  en: {
    brand:"FINISHING BOQ",subtitle:"Finishing Quantity Survey & Cost Estimation",projects:"Projects",newProject:"New project",projectName:"Project name",
    type:"Project type",apartment:"Apartment",villa:"Villa",buildingCondition:"Existing building condition",brick:"Red brick / unfinished",renovation:"Renovation & refit",plaster:"Plaster only",semiFinished:"Semi-finished",fullyFinished:"Fully finished",alteration:"Internal alterations, demolition & new walls",shell:"New concrete shell",unspecified:"Unspecified / legacy project",create:"Create project",room:"Add room",roomName:"Room name",length:"Length (m)",width:"Width (m)",
    height:"Height (m)",addRoom:"Save room",overview:"Project overview",floor:"Floor area",walls:"Net wall area",ceiling:"Ceiling area",
    gross:"Gross walls",deductions:"Opening deductions",perimeter:"Perimeter",rooms:"Rooms",empty:"Create a project, then add rooms to see the takeoff.",
    noRooms:"No rooms added yet.",verified:"Arithmetic checks passed",review:"Needs review",export:"Export CSV",exportXlsx:"Export Excel",printReport:"PDF report / print",currencyPrompt:"Enter the report currency (e.g. EGP):",storageError:"Could not save to the local database.",costing:"Cost & adjustments",currency:"Project currency",currencyPlaceholder:"e.g. EGP",adjLabel:"Adjustment name",adjKind:"Kind",kTransport:"Transport",kEngineerFee:"Engineering fee",kOverhead:"Overhead",kContingency:"Contingency",kProfit:"Profit",kTax:"Tax",kOther:"Other",adjRate:"Rate %",adjFixed:"Fixed amount",adjBase:"Rate base",baseDirect:"Direct cost",baseCumulative:"Cumulative (incl. earlier adjustments)",adjOrder:"Order",adjApproval:"Approval reference",adjVisible:"Visible to client",addAdjustment:"Add",directSubtotal:"Direct cost",adjustmentsTotal:"Adjustments total",grandTotal:"Grand total",costIncomplete:"The total is incomplete: some items are unpriced or need review.",costComplete:"All items are priced and verified.",adjHint:"Every adjustment needs an approval reference. There are no default rates: enter a rate with an explicit base, or a fixed amount, not both.",hiddenLabel:"Hidden from client",noAdjustments:"No adjustments yet.",currencyMissing:"No currency entered yet.",
variations:"Variation orders",newVariation:"New variation order",voNumber:"Number",voTitle:"Title",voReason:"Reason",voBaseRevision:"Base BOQ revision",createVariation:"Create order",stDraft:"Draft",stSubmitted:"Submitted",stApproved:"Approved",stRejected:"Rejected",voAddition:"Addition",voOmission:"Omission from BOQ",voDirection:"Type",voSubmit:"Submit",voApprove:"Approve",voReject:"Reject",voReopen:"Back to draft",voDelete:"Delete order",voApprovalPrompt:"Enter the approval reference for this order:",voTotal:"Order net",voBaseTotal:"Base total",voApprovedTotal:"Approved variations",voRevisedTotal:"Revised total",voPendingTotal:"Pending approval",voLocked:"Items can only be edited while the order is a draft.",noVariations:"No variation orders yet.",voIncomplete:"Orders with unpriced items",voNoItems:"No items.",addVoItem:"Add item",
language:"العربية",
    disclaimer:"Foundation build: do not use as an execution BOQ until dimensions, deduction rules, and drawing sources are reviewed.",
    wallFace:"Wall face",addWallFace:"Add wall face",faceLength:"Face length (m)",faceHeight:"Face height (m)",opening:"Opening",addOpening:"Add opening",
    deduct:"Deduct from wall area",noFaces:"No measured wall faces have been entered yet.",remove:"Remove",measuredFaces:"Measured wall faces",openings:"Openings",createError:"Check the entered values.",boq:"Bill of Quantities",boqCode:"Item code",boqDescription:"Item description",boqUnit:"Unit",boqQuantity:"Net quantity",boqSource:"Quantity source reference",wasteRate:"Approved waste %",wasteApproval:"Waste approval reference",unitRate:"Unit rate",rateSource:"Rate source reference",costBasis:"Cost basis",netBasis:"Net quantity",orderBasis:"Order quantity",addBoq:"Add BOQ item",subtotal:"Priced subtotal",unpriced:"Unpriced items",lineTotal:"Line total",removeItem:"Remove item",boqStatus:"Review status",addRoomTakeoff:"Add room quantities to BOQ",takeoffAdded:"New quantities added",takeoffUpdated:"Linked quantities refreshed after measurement changes",takeoffSkipped:"Unchanged items",wallTakeoffReview:"Wall measurements need review",staleWallTakeoff:"Previous wall BOQ snapshots are stale and need review"
  }
};
function t(key:keyof typeof copy.ar):string{return copy[language][key];}
function el<T extends HTMLElement>(selector:string):T{const node=document.querySelector<T>(selector);if(!node)throw new Error(`Missing element: ${selector}`);return node;}
function escapeHtml(value:string):string{return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));}
function activeProject():ProjectRecord|undefined{return projects.find(p=>p.id===activeProjectId);}
function persist():void{
  if(storage){storage.saveMany(projects).catch(()=>alert(t("storageError")));}
  else saveProjects(projects);
  render();
}
async function initStorage():Promise<void>{
  try{
    const db=new IndexedDbProjectStorage();
    await migrateFromLocalStorage(db);
    projects=await db.loadAll();
    storage=db;
  }catch{
    // IndexedDB unavailable (e.g. private mode): fall back to the legacy store so nothing is lost.
    projects=loadProjects();
  }
  activeProjectId=projects[0]?.id??"";
  render();
}

function render():void{
  document.documentElement.lang=language;document.documentElement.dir=language==="ar"?"rtl":"ltr";
  const project=activeProject();
  el<HTMLDivElement>("#app").innerHTML=`
    <div class="shell"><aside class="sidebar">
      <div class="brand"><div class="brand-mark">F</div><div><strong>${t("brand")}</strong><small>${t("subtitle")}</small></div></div>
      <div class="side-heading">${t("projects")}</div>
      <div class="project-list">${projects.map(p=>`<button class="project-link ${p.id===activeProjectId?"selected":""}" data-project="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>`).join("")||`<p class="muted">${t("empty")}</p>`}</div>
      <button class="outline full" id="new-project-toggle">＋ ${t("newProject")}</button>
      <div class="sidebar-bottom"><button class="language" id="language-toggle">${t("language")}</button><span>v0.2.0 · Local preview</span></div>
    </aside><main class="main">
      <header class="topbar"><div><span class="eyebrow">QUANTITY SURVEYING</span><h1>${project?escapeHtml(project.name):t("brand")}</h1></div><span class="status">LOCAL PREVIEW</span></header>
      <section id="new-project-panel" class="panel form-panel hidden"><h2>${t("newProject")}</h2><form id="project-form" class="form-grid">
        <label>${t("projectName")}<input name="name" required maxlength="100"/></label>
        <label>${t("type")}<select name="type"><option value="apartment">${t("apartment")}</option><option value="villa">${t("villa")}</option></select></label>\n        <label>${t("buildingCondition")}<select name="buildingCondition" required><option value="" disabled selected>${t("buildingCondition")}</option><option value="red-brick">${t("brick")}</option><option value="renovation">${t("renovation")}</option><option value="plaster-only">${t("plaster")}</option><option value="semi-finished">${t("semiFinished")}</option><option value="fully-finished">${t("fullyFinished")}</option><option value="alteration">${t("alteration")}</option><option value="concrete-shell">${t("shell")}</option></select></label>
        <button class="primary" type="submit">${t("create")}</button>
      </form></section>
      ${project?renderProject(project):`<section class="welcome panel"><div class="welcome-icon">⌂</div><h2>${t("brand")}</h2><p>${t("empty")}</p><button class="primary" id="welcome-create">${t("newProject")}</button></section>`}
      <footer class="disclaimer">${t("disclaimer")}</footer>
    </main></div>`;
  document.querySelectorAll<HTMLButtonElement>("[data-project]").forEach(button=>button.addEventListener("click",()=>{activeProjectId=button.dataset.project??"";render();}));
  el("#new-project-toggle").addEventListener("click",()=>el("#new-project-panel").classList.toggle("hidden"));
  document.querySelector("#welcome-create")?.addEventListener("click",()=>el("#new-project-panel").classList.remove("hidden"));
  el("#language-toggle").addEventListener("click",()=>{language=language==="ar"?"en":"ar";render();});
  document.querySelector<HTMLFormElement>("#project-form")?.addEventListener("submit",createProject);
  document.querySelector<HTMLFormElement>("#room-form")?.addEventListener("submit",addRoom);
  document.querySelector<HTMLFormElement>("#boq-form")?.addEventListener("submit",addBoqItem);
  document.querySelector<HTMLButtonElement>("#add-room-takeoff")?.addEventListener("click",addRoomTakeoff);
  document.querySelector<HTMLDivElement>("#boq-items")?.addEventListener("click",removeBoqItem);
  document.querySelector<HTMLDivElement>("#room-editor-list")?.addEventListener("submit",editRoom);
  document.querySelector<HTMLDivElement>("#room-editor-list")?.addEventListener("click",removeRoomItem);
  document.querySelector<HTMLButtonElement>("#export-csv")?.addEventListener("click",exportCsv);
  document.querySelector<HTMLButtonElement>("#export-xlsx")?.addEventListener("click",exportXlsx);
  document.querySelector<HTMLButtonElement>("#print-report")?.addEventListener("click",printReport);
  document.querySelector<HTMLInputElement>("#project-currency")?.addEventListener("change",saveCurrency);
  const costPanel=document.querySelector<HTMLElement>("#cost-panel");
  costPanel?.addEventListener("submit",addAdjustmentHandler);
  costPanel?.addEventListener("click",removeAdjustmentHandler);
  const variationPanel=document.querySelector<HTMLElement>("#variation-panel");
  variationPanel?.addEventListener("submit",variationSubmitHandler);
  variationPanel?.addEventListener("click",variationClickHandler);
}
function renderProject(project:ProjectRecord):string{
  const results=project.rooms.map(room=>({room,result:calculateRoomQuantities(room)}));
  const total=(key:"floorAreaM2"|"ceilingAreaM2"|"wallNetAreaM2"|"wallGrossAreaM2"|"openingDeductionM2"|"perimeterM")=>results.reduce((sum,row)=>sum+row.result[key],0);
  return `
    <section class="stats-grid">${stat(t("floor"),total("floorAreaM2"),"m²","01")}${stat(t("walls"),total("wallNetAreaM2"),"m²","02")}${stat(t("ceiling"),total("ceilingAreaM2"),"m²","03")}${stat(t("perimeter"),total("perimeterM"),"m","04")}</section>
    <section class="content-grid">
      <div class="panel"><div class="panel-head"><div><span class="eyebrow">TAKEOFF INPUT</span><h2>${t("room")}</h2></div></div>
        <form id="room-form" class="room-form">
          <label>${t("roomName")}<input name="name" required maxlength="80" placeholder="${language==="ar"?"مثال: المطبخ":"e.g. Kitchen"}"/></label>
          <div class="input-row"><label>${t("length")}<input name="length" type="number" min="0.01" step="0.01" required/></label><label>${t("width")}<input name="width" type="number" min="0.01" step="0.01" required/></label></div>
          <label>${t("height")}<input name="height" type="number" min="0.01" step="0.01" required/></label>
          <p class="hint">${language==="ar"?"لن يتم افتراض أوجه الحوائط. أضف كل وجه بقياسه الفعلي، ثم اربط الفتحات بالوجه الصحيح.":"Wall faces are never auto-generated. Enter each measured face, then assign openings to the correct face."}</p>
          <button class="primary" type="submit">${t("addRoom")}</button>
        </form>
      </div>
      <div class="panel"><div class="panel-head"><div><span class="eyebrow">PROJECT DATA</span><h2>${t("overview")}</h2></div><div class="actions"><button class="outline" id="export-csv">${t("export")}</button><button class="outline" id="export-xlsx">${t("exportXlsx")}</button><button class="outline" id="print-report">${t("printReport")}</button></div></div>
        <div class="mini-metrics"><div><span>${t("gross")}</span><strong>${total("wallGrossAreaM2").toFixed(2)} m²</strong></div><div><span>${t("deductions")}</span><strong>${total("openingDeductionM2").toFixed(2)} m²</strong></div></div>
        <div class="room-list"><h3>${t("rooms")} · ${project.rooms.length}</h3>
          ${results.length?results.map(({room,result})=>`<div class="room-row"><div><strong>${escapeHtml(room.name)}</strong><small>${room.lengthM} × ${room.widthM} × ${room.heightM} m · ${room.wallFaces.length} ${t("measuredFaces")}</small></div><div class="room-values"><strong>${result.floorAreaM2.toFixed(2)} m²</strong><small class="${result.verification==="matched"?"good":"warn"}">${result.verification==="matched"?t("verified"):t("review")}</small></div></div>`).join(""):`<p class="muted">${t("noRooms")}</p>`}
        </div>
      </div>
    </section>
    <section class="panel room-editor-panel"><div class="panel-head"><div><span class="eyebrow">MEASURED GEOMETRY</span><h2>${t("measuredFaces")} &amp; ${t("openings")}</h2></div></div>
      <div id="room-editor-list">${project.rooms.map(renderRoomEditor).join("")||`<p class="muted">${t("noRooms")}</p>`}</div>
    </section>${renderBoq(project)}${renderCosting(project)}${renderVariations(project)}`;
}
function renderBoq(project:ProjectRecord):string{
  const summary=calculateBoq(project.boqItems);
  const rows=summary.items.map(item=>"<tr><td>"+escapeHtml(item.code)+"</td><td>"+escapeHtml(item.description)+"<small>"+escapeHtml(item.sourceRef)+"</small></td><td>"+item.netQuantity.toFixed(2)+" "+item.unit+"</td><td>"+(item.wasteRatePct===null?"—":item.wasteRatePct+"%")+"</td><td>"+(item.unitRate===null?"—":item.unitRate.toFixed(2))+"</td><td>"+(item.lineTotal===null?"—":item.lineTotal.toFixed(2))+"</td><td class=\""+(item.status==="verified"?"good":"warn")+"\">"+(item.status==="verified"?t("verified"):t("review"))+"</td><td><button class=\"text-button danger\" data-remove-boq=\""+escapeHtml(item.id)+"\">"+t("removeItem")+"</button></td></tr>").join("");
  return "<section class=\"panel boq-panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">COST ESTIMATION</span><h2>"+t("boq")+"</h2></div><button class=\"outline\" id=\"add-room-takeoff\" type=\"button\">"+t("addRoomTakeoff")+"</button></div>"+
    "<form id=\"boq-form\" class=\"boq-form\"><label>"+t("boqCode")+"<input name=\"code\" required maxlength=\"40\"></label><label>"+t("boqDescription")+"<input name=\"description\" required maxlength=\"180\"></label><label>"+t("boqUnit")+"<select name=\"unit\"><option value=\"m\">m</option><option value=\"m2\">m²</option><option value=\"m3\">m³</option><option value=\"pcs\">pcs</option></select></label><label>"+t("boqQuantity")+"<input name=\"netQuantity\" type=\"number\" min=\"0\" step=\"0.0001\" required></label><label>"+t("boqSource")+"<input name=\"sourceRef\" required maxlength=\"160\"></label><label>"+t("wasteRate")+"<input name=\"approvedWasteRatePct\" type=\"number\" min=\"0\" step=\"0.01\"></label><label>"+t("wasteApproval")+"<input name=\"wasteApprovalRef\" maxlength=\"160\"></label><label>"+t("unitRate")+"<input name=\"unitRate\" type=\"number\" min=\"0\" step=\"0.01\"></label><label>"+t("rateSource")+"<input name=\"rateSourceRef\" maxlength=\"160\"></label><label>"+t("costBasis")+"<select name=\"costQuantityBasis\"><option value=\"net\">"+t("netBasis")+"</option><option value=\"order\">"+t("orderBasis")+"</option></select></label><button class=\"primary\" type=\"submit\">"+t("addBoq")+"</button></form>"+
    "<div class=\"boq-summary\"><div><span>"+t("subtotal")+"</span><strong>"+summary.pricedSubtotal.toFixed(2)+"</strong></div><div><span>"+t("unpriced")+"</span><strong>"+summary.unpricedItems+"</strong></div></div>"+
    "<div id=\"boq-items\" class=\"boq-table-wrap\"><table class=\"boq-table\"><thead><tr><th>"+t("boqCode")+"</th><th>"+t("boqDescription")+"</th><th>"+t("boqQuantity")+"</th><th>"+t("wasteRate")+"</th><th>"+t("unitRate")+"</th><th>"+t("lineTotal")+"</th><th>"+t("boqStatus")+"</th><th></th></tr></thead><tbody>"+(rows||"<tr><td colspan=\"8\" class=\"muted\">—</td></tr>")+"</tbody></table></div><p class=\"hint\">"+(language==="ar"?"لا يتم افتراض الهالك أو الأسعار. يلزم مرجع اعتماد مستقل للهالك ومرجع مصدر لكل سعر.":"Waste and rates are never assumed. Waste approval and rate source references are required.")+"</p></section>";
}
function renderRoomEditor(room:RoomInput):string{
  const result=calculateRoomQuantities(room);
  return `<article class="room-editor"><div class="room-editor-head"><div><strong>${escapeHtml(room.name)}</strong><small>${room.lengthM} × ${room.widthM} × ${room.heightM} m</small></div><span class="room-state ${result.verification==="matched"?"good":"warn"}">${result.verification==="matched"?t("verified"):t("review")}</span></div>
    <form class="face-form" data-action="add-face" data-room-id="${escapeHtml(room.id)}">
      <label>${t("faceLength")}<input name="length" type="number" min="0.01" step="0.01" required/></label>
      <label>${t("faceHeight")}<input name="height" type="number" min="0.01" step="0.01" required/></label>
      <button class="outline" type="submit">＋ ${t("addWallFace")}</button>
    </form>
    ${room.wallFaces.length?room.wallFaces.map(face=>`<div class="face-card"><div class="face-head"><strong>${t("wallFace")} · ${escapeHtml(face.id.slice(0,8))}</strong><span>${face.lengthM} × ${face.heightM} m</span><button class="text-button danger" data-remove-face="1" data-room-id="${escapeHtml(room.id)}" data-face-id="${escapeHtml(face.id)}">${t("remove")}</button></div>
      <div class="opening-list">${face.openings.map(opening=>`<div class="opening-row"><span>${t("opening")} · ${opening.widthM} × ${opening.heightM} m · ${opening.deductionEnabled?t("deduct"):"—"}</span><button class="text-button danger" data-remove-opening="1" data-room-id="${escapeHtml(room.id)}" data-face-id="${escapeHtml(face.id)}" data-opening-id="${escapeHtml(opening.id)}">${t("remove")}</button></div>`).join("")}</div>
      <form class="opening-form" data-action="add-opening" data-room-id="${escapeHtml(room.id)}" data-face-id="${escapeHtml(face.id)}">
        <label>${t("width")}<input name="width" type="number" min="0.01" step="0.01" required/></label><label>${t("height")}<input name="height" type="number" min="0.01" step="0.01" required/></label>
        <label class="check-label"><input name="deductionEnabled" type="checkbox" checked/> ${t("deduct")}</label><button class="outline" type="submit">＋ ${t("addOpening")}</button>
      </form></div>`).join(""):`<p class="hint">${t("noFaces")}</p>`}
    ${result.checks.length?`<ul class="validation-list">${result.checks.map(check=>`<li>${escapeHtml(check)}</li>`).join("")}</ul>`:""}
  </article>`;
}
function stat(label:string,value:number,unit:string,index:string):string{return `<article class="stat-card"><span class="stat-index">${index}</span><span class="stat-label">${label}</span><strong>${value.toFixed(2)} <small>${unit}</small></strong></article>`;}
function createProject(event:SubmitEvent):void{
  event.preventDefault();const data=new FormData(event.currentTarget as HTMLFormElement);const name=String(data.get("name")??"").trim();if(!name)return;
  const project:ProjectRecord={id:createId(),name,projectType:(String(data.get("type")??"apartment")==="villa"?"villa":"apartment"),buildingCondition:String(data.get("buildingCondition")??"unspecified") as BuildingCondition,createdAt:new Date().toISOString(),rooms:[],boqItems:[]};
  projects=[...projects,project];activeProjectId=project.id;persist();
}
function addRoom(event:SubmitEvent):void{
  event.preventDefault();const project=activeProject();if(!project)return;const data=new FormData(event.currentTarget as HTMLFormElement);
  const name=String(data.get("name")??"").trim(),lengthM=Number(data.get("length")),widthM=Number(data.get("width")),heightM=Number(data.get("height"));
  if(!name||![lengthM,widthM,heightM].every(n=>Number.isFinite(n)&&n>0))return;
  const room:RoomInput={id:createId(),name,lengthM,widthM,heightM,wallFaces:[]};calculateRoomQuantities(room);project.rooms.push(room);persist();
}
function addBoqItem(event:SubmitEvent):void{
  event.preventDefault();const project=activeProject();if(!project)return;const data=new FormData(event.currentTarget as HTMLFormElement);
  const netQuantity=Number(data.get("netQuantity"));const wasteRaw=String(data.get("approvedWasteRatePct")??"").trim();const rateRaw=String(data.get("unitRate")??"").trim();
  const item:BoqItemInput={id:createId(),code:String(data.get("code")??"").trim(),description:String(data.get("description")??"").trim(),unit:String(data.get("unit")??"m2") as BoqUnit,netQuantity,sourceRef:String(data.get("sourceRef")??"").trim()};
  if(wasteRaw!==""){item.approvedWasteRatePct=Number(wasteRaw);item.wasteApprovalRef=String(data.get("wasteApprovalRef")??"").trim();}
  if(rateRaw!==""){item.unitRate=Number(rateRaw);item.rateSourceRef=String(data.get("rateSourceRef")??"").trim();item.costQuantityBasis=String(data.get("costQuantityBasis")??"net") as "net"|"order";}
  try{calculateBoqItem(item);project.boqItems.push(item);persist();}catch(error){window.alert(error instanceof Error?error.message:t("createError"));}
}
function addRoomTakeoff():void{
  const project=activeProject();if(!project)return;
  try{
    const result=generateRoomBoqItems(project.rooms,project.boqItems,createId);
    if(result.addedItems.length || result.updatedItems.length){
      const updatedById=new Map(result.updatedItems.map(item=>[item.id,item]));
      project.boqItems=project.boqItems.map(item=>updatedById.get(item.id)??item);
      project.boqItems.push(...result.addedItems);
      persist();
    }
    const message=`${t("takeoffAdded")}: ${result.addedItems.length} · ${t("takeoffUpdated")}: ${result.updatedItems.length} · ${t("takeoffSkipped")}: ${result.alreadyPresentCount} · ${t("wallTakeoffReview")}: ${result.wallReviewCount} · ${t("staleWallTakeoff")}: ${result.staleWallSourceRefs.length}`;
    window.alert(message);
  }catch(error){window.alert(error instanceof Error?error.message:t("createError"));}
}
function removeBoqItem(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>("[data-remove-boq]");if(!button)return;
  const project=activeProject();if(!project)return;project.boqItems=project.boqItems.filter(item=>item.id!==button.dataset.removeBoq);persist();
}
function editRoom(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;const action=form.dataset.action;if(!action)return;event.preventDefault();
  const project=activeProject();if(!project)return;const data=new FormData(form);const room=project.rooms.find(item=>item.id===form.dataset.roomId);if(!room)return;
  try{
    if(action==="add-face"){
      const lengthM=Number(data.get("length")),heightM=Number(data.get("height"));if(!(lengthM>0&&heightM>0&&Number.isFinite(lengthM)&&Number.isFinite(heightM)))return;
      room.wallFaces.push({id:createId(),lengthM,heightM,openings:[]});
    }else if(action==="add-opening"){
      const face=room.wallFaces.find(item=>item.id===form.dataset.faceId);if(!face)return;
      const widthM=Number(data.get("width")),heightM=Number(data.get("height"));if(!(widthM>0&&heightM>0&&Number.isFinite(widthM)&&Number.isFinite(heightM)))return;
      face.openings.push({id:createId(),widthM,heightM,deductionEnabled:data.get("deductionEnabled")==="on"});
    }
    calculateRoomQuantities(room);persist();
  }catch(error){window.alert(error instanceof Error?error.message:t("createError"));}
}
function removeRoomItem(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>("[data-remove-face],[data-remove-opening]");if(!button)return;
  const project=activeProject();if(!project)return;const room=project.rooms.find(item=>item.id===button.dataset.roomId);if(!room)return;
  if(button.dataset.removeFace){room.wallFaces=room.wallFaces.filter(face=>face.id!==button.dataset.faceId);}
  else{const face=room.wallFaces.find(item=>item.id===button.dataset.faceId);if(face)face.openings=face.openings.filter(opening=>opening.id!==button.dataset.openingId);}
  persist();
}
function exportCsv():void{
  const project=activeProject();if(!project)return;
  const rows=[["Room","Floor m2","Ceiling m2","Gross walls m2","Opening deductions m2","Net walls m2","Perimeter m","Verification","Checks"]];
  for(const room of project.rooms){const r=calculateRoomQuantities(room);rows.push([room.name,r.floorAreaM2,r.ceilingAreaM2,r.wallGrossAreaM2,r.openingDeductionM2,r.wallNetAreaM2,r.perimeterM,r.verification,r.checks.join("; ")].map(String));}
  const csv="\uFEFF"+rows.map(row=>row.map(value=>`"${value.replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`${project.name.replace(/[^\p{L}\p{N}-]+/gu,"-")}-takeoff.csv`;a.click();URL.revokeObjectURL(url);
}

const KIND_LABELS:Record<string,keyof typeof copy.ar>={transport:"kTransport","engineer-fee":"kEngineerFee",overhead:"kOverhead",contingency:"kContingency",profit:"kProfit",tax:"kTax",other:"kOther"};
const STATUS_LABELS:Record<VariationStatus,keyof typeof copy.ar>={draft:"stDraft",submitted:"stSubmitted",approved:"stApproved",rejected:"stRejected"};
function field(data:FormData,name:string):string{return String(data.get(name)??"");}
function showError(error:unknown):void{window.alert(error instanceof Error?error.message:t("createError"));}
function money(value:number|null):string{return value===null?"—":value.toFixed(2);}

function renderCosting(project:ProjectRecord):string{
  let financials;
  try{financials=projectFinancials(project);}catch(error){return `<section class="panel boq-panel"><p class="warn">${escapeHtml(error instanceof Error?error.message:t("createError"))}</p></section>`;}
  const {cost,currencyMissing}=financials;
  const orderById=new Map(adjustmentsOf(project).map(a=>[a.id,a.order]));
  const kinds=Object.keys(KIND_LABELS).map(kind=>`<option value="${kind}">${t(KIND_LABELS[kind])}</option>`).join("");
  const rows=cost.adjustments.map(a=>`<tr><td>${orderById.get(a.id)??""}</td><td>${escapeHtml(a.label)}<small>${escapeHtml(a.approvalRef)}</small></td><td>${t(KIND_LABELS[a.kind])}</td><td>${a.ratePct===null?"—":`${a.ratePct}% · ${a.base==="cumulative"?t("baseCumulative"):t("baseDirect")}`}</td><td>${money(a.amount)}</td><td class="warn">${a.clientVisible?"":t("hiddenLabel")}</td><td><button class="text-button danger" data-remove-adjustment="${escapeHtml(a.id)}">${t("remove")}</button></td></tr>`).join("");
  return `<section class="panel boq-panel" id="cost-panel"><div class="panel-head"><div><span class="eyebrow">COST SUMMARY</span><h2>${t("costing")}</h2></div></div>
    <label class="currency-label">${t("currency")}<input id="project-currency" maxlength="12" value="${escapeHtml(project.currency??"")}" placeholder="${t("currencyPlaceholder")}"/></label>
    ${currencyMissing?`<p class="hint warn">${t("currencyMissing")}</p>`:""}
    <form id="adjustment-form" class="boq-form">
      <label>${t("adjLabel")}<input name="label" required maxlength="80"/></label>
      <label>${t("adjKind")}<select name="kind">${kinds}</select></label>
      <label>${t("adjRate")}<input name="ratePct" type="number" min="0" step="0.01"/></label>
      <label>${t("adjBase")}<select name="base"><option value="direct">${t("baseDirect")}</option><option value="cumulative">${t("baseCumulative")}</option></select></label>
      <label>${t("adjFixed")}<input name="fixedAmount" type="number" min="0" step="0.01"/></label>
      <label>${t("adjOrder")}<input name="order" type="number" step="1" placeholder="auto"/></label>
      <label>${t("adjApproval")}<input name="approvalRef" required maxlength="160"/></label>
      <label class="check-label"><input name="clientVisible" type="checkbox" checked/> ${t("adjVisible")}</label>
      <button class="primary" type="submit">${t("addAdjustment")}</button>
    </form>
    <p class="hint">${t("adjHint")}</p>
    <div class="boq-summary"><div><span>${t("directSubtotal")}</span><strong>${money(cost.directSubtotal)}</strong></div><div><span>${t("adjustmentsTotal")}</span><strong>${money(cost.adjustmentsTotal)}</strong></div><div><span>${t("grandTotal")} (${escapeHtml(cost.currency)})</span><strong>${money(cost.grandTotal)}</strong></div></div>
    <p class="hint ${cost.complete?"good":"warn"}">${cost.complete?t("costComplete"):t("costIncomplete")}</p>
    <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("adjOrder")}</th><th>${t("adjLabel")}</th><th>${t("adjKind")}</th><th>${t("adjRate")}</th><th>${t("lineTotal")}</th><th></th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="7" class="muted">${t("noAdjustments")}</td></tr>`}</tbody></table></div>
  </section>`;
}

function renderVariations(project:ProjectRecord):string{
  const list=variationsOf(project);
  let revisedHtml="";
  try{
    const {revised}=projectFinancials(project);
    if(revised){
      revisedHtml=`<div class="boq-summary"><div><span>${t("voBaseTotal")}</span><strong>${money(revised.baseTotal)}</strong></div><div><span>${t("voApprovedTotal")}</span><strong>${money(revised.approvedVariationsTotal)}</strong></div><div><span>${t("voRevisedTotal")}</span><strong>${money(revised.revisedTotal)}</strong></div><div><span>${t("voPendingTotal")}</span><strong>${money(revised.pendingVariationsTotal)}</strong></div></div>${revised.incompleteVariationNumbers.length?`<p class="hint warn">${t("voIncomplete")}: ${escapeHtml(revised.incompleteVariationNumbers.join(", "))}</p>`:""}`;
    }
  }catch(error){revisedHtml=`<p class="hint warn">${escapeHtml(error instanceof Error?error.message:t("createError"))}</p>`;}
  const cards=list.map(vo=>renderVariationCard(vo)).join("")||`<p class="muted">${t("noVariations")}</p>`;
  return `<section class="panel boq-panel" id="variation-panel"><div class="panel-head"><div><span class="eyebrow">CHANGE CONTROL</span><h2>${t("variations")}</h2></div></div>
    <form id="variation-form" class="boq-form">
      <label>${t("voNumber")}<input name="number" required maxlength="30" value="${escapeHtml(nextVariationNumber(list))}"/></label>
      <label>${t("voTitle")}<input name="title" required maxlength="120"/></label>
      <label>${t("voReason")}<input name="reason" required maxlength="200"/></label>
      <label>${t("voBaseRevision")}<input name="baseRevision" required maxlength="60"/></label>
      <button class="primary" type="submit">${t("createVariation")}</button>
    </form>
    ${revisedHtml}${cards}
  </section>`;
}

function renderVariationCard(vo:VariationOrder):string{
  let totalText="—",checks:string[]=[];
  const lines=vo.items.map(entry=>{
    try{const r=calculateVariation({...vo,items:[entry]});const line=r.lines[0].result;return `<tr><td>${entry.direction==="omission"?t("voOmission"):t("voAddition")}</td><td>${escapeHtml(line.code)}</td><td>${escapeHtml(line.description)}<small>${escapeHtml(line.sourceRef)}</small></td><td>${line.netQuantity} ${line.unit}</td><td>${money(line.unitRate)}</td><td>${money(line.lineTotal)}</td><td>${vo.status==="draft"?`<button class="text-button danger" data-remove-vo-item="${escapeHtml(entry.item.id)}" data-vo-id="${escapeHtml(vo.id)}">${t("remove")}</button>`:""}</td></tr>`;}
    catch(error){return `<tr><td colspan="7" class="warn">${escapeHtml(error instanceof Error?error.message:t("createError"))}</td></tr>`;}
  }).join("");
  try{const r=calculateVariation(vo);totalText=money(r.total);checks=r.checks;}catch(error){checks=[error instanceof Error?error.message:t("createError")];}
  const draft=vo.status==="draft";
  const actions=[
    draft?`<button class="outline" data-vo-action="submitted" data-vo-id="${escapeHtml(vo.id)}">${t("voSubmit")}</button>`:"",
    vo.status==="submitted"?`<button class="outline" data-vo-action="approved" data-vo-id="${escapeHtml(vo.id)}">${t("voApprove")}</button><button class="outline" data-vo-action="rejected" data-vo-id="${escapeHtml(vo.id)}">${t("voReject")}</button><button class="outline" data-vo-action="draft" data-vo-id="${escapeHtml(vo.id)}">${t("voReopen")}</button>`:"",
    vo.status==="rejected"?`<button class="outline" data-vo-action="draft" data-vo-id="${escapeHtml(vo.id)}">${t("voReopen")}</button>`:"",
    canDeleteVariation(vo)?`<button class="text-button danger" data-vo-delete="1" data-vo-id="${escapeHtml(vo.id)}">${t("voDelete")}</button>`:""
  ].join("");
  const itemForm=draft?`<form class="boq-form vo-item-form" data-vo-id="${escapeHtml(vo.id)}">
      <label>${t("voDirection")}<select name="direction"><option value="addition">${t("voAddition")}</option><option value="omission">${t("voOmission")}</option></select></label>
      <label>${t("boqCode")}<input name="code" required maxlength="40"/></label>
      <label>${t("boqDescription")}<input name="description" required maxlength="180"/></label>
      <label>${t("boqUnit")}<select name="unit"><option value="m">m</option><option value="m2">m²</option><option value="m3">m³</option><option value="pcs">pcs</option></select></label>
      <label>${t("boqQuantity")}<input name="netQuantity" type="number" min="0" step="0.0001" required/></label>
      <label>${t("boqSource")}<input name="sourceRef" required maxlength="160"/></label>
      <label>${t("unitRate")}<input name="unitRate" type="number" min="0" step="0.01"/></label>
      <label>${t("rateSource")}<input name="rateSourceRef" maxlength="160"/></label>
      <button class="primary" type="submit">${t("addVoItem")}</button></form>`:`<p class="hint">${t("voLocked")}</p>`;
  return `<article class="room-editor"><div class="room-editor-head"><div><strong>${escapeHtml(vo.number)} · ${escapeHtml(vo.title)}</strong><small>${escapeHtml(vo.reason)} · ${escapeHtml(vo.baseRevision)}${vo.approvalRef?` · ${escapeHtml(vo.approvalRef)}`:""}</small></div><span class="room-state ${vo.status==="approved"?"good":"warn"}">${t(STATUS_LABELS[vo.status])} · ${t("voTotal")}: ${totalText}</span></div>
    <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("voDirection")}</th><th>${t("boqCode")}</th><th>${t("boqDescription")}</th><th>${t("boqQuantity")}</th><th>${t("unitRate")}</th><th>${t("lineTotal")}</th><th></th></tr></thead><tbody>${lines||`<tr><td colspan="7" class="muted">${t("voNoItems")}</td></tr>`}</tbody></table></div>
    ${checks.length?`<ul class="validation-list">${checks.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>`:""}
    ${itemForm}<div class="actions vo-actions">${actions}</div></article>`;
}

function saveCurrency(event:Event):void{
  const project=activeProject();const input=event.target;if(!project||!(input instanceof HTMLInputElement))return;
  project.currency=input.value.trim();persist();
}
function addAdjustmentHandler(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=="adjustment-form")return;
  event.preventDefault();const project=activeProject();if(!project)return;const data=new FormData(form);
  try{
    const adjustment=buildAdjustment(project,{label:field(data,"label"),kind:field(data,"kind"),ratePct:field(data,"ratePct"),fixedAmount:field(data,"fixedAmount"),base:field(data,"base"),order:field(data,"order"),approvalRef:field(data,"approvalRef"),clientVisible:data.get("clientVisible")==="on"},createId());
    project.adjustments=[...adjustmentsOf(project),adjustment];persist();
  }catch(error){showError(error);}
}
function removeAdjustmentHandler(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;const button=target.closest<HTMLButtonElement>("[data-remove-adjustment]");if(!button)return;
  const project=activeProject();if(!project)return;
  project.adjustments=adjustmentsOf(project).filter(a=>a.id!==button.dataset.removeAdjustment);persist();
}
function replaceVariation(project:ProjectRecord,updated:VariationOrder):void{
  project.variations=variationsOf(project).map(vo=>vo.id===updated.id?updated:vo);
}
function variationSubmitHandler(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  const project=activeProject();if(!project)return;
  if(form.id==="variation-form"){
    event.preventDefault();const data=new FormData(form);
    try{
      const vo=createVariation(variationsOf(project),{number:field(data,"number"),title:field(data,"title"),reason:field(data,"reason"),baseRevision:field(data,"baseRevision")},createId(),new Date().toISOString());
      project.variations=[...variationsOf(project),vo];persist();
    }catch(error){showError(error);}
    return;
  }
  if(form.classList.contains("vo-item-form")){
    event.preventDefault();const data=new FormData(form);
    const vo=variationsOf(project).find(item=>item.id===form.dataset.voId);if(!vo)return;
    try{
      const entry=buildVariationItem({direction:field(data,"direction"),code:field(data,"code"),description:field(data,"description"),unit:field(data,"unit"),netQuantity:field(data,"netQuantity"),sourceRef:field(data,"sourceRef"),unitRate:field(data,"unitRate"),rateSourceRef:field(data,"rateSourceRef")},createId());
      replaceVariation(project,addVariationItem(vo,entry));persist();
    }catch(error){showError(error);}
  }
}
function variationClickHandler(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const button=target.closest<HTMLButtonElement>("[data-vo-action],[data-vo-delete],[data-remove-vo-item]");if(!button)return;
  const project=activeProject();if(!project)return;
  const vo=variationsOf(project).find(item=>item.id===button.dataset.voId);if(!vo)return;
  try{
    if(button.dataset.voDelete){
      if(!canDeleteVariation(vo))throw new Error(`${vo.number}: ${t("voLocked")}`);
      project.variations=variationsOf(project).filter(item=>item.id!==vo.id);persist();return;
    }
    if(button.dataset.removeVoItem){replaceVariation(project,removeVariationItem(vo,button.dataset.removeVoItem));persist();return;}
    const next=button.dataset.voAction as VariationStatus;
    let approvalRef:string|undefined;
    if(next==="approved"){const answer=window.prompt(t("voApprovalPrompt"));if(answer===null||!answer.trim())return;approvalRef=answer;}
    replaceVariation(project,transitionVariation(vo,next,approvalRef));persist();
  }catch(error){showError(error);}
}
function reportInput(project:ProjectRecord){
  const currency=(project.currency??"").trim()||window.prompt(t("currencyPrompt"))?.trim();
  if(!currency)return null;
  return{projectName:project.name,buildingCondition:project.buildingCondition,generatedAt:new Date().toISOString().slice(0,10),currency,rooms:project.rooms,items:project.boqItems,adjustments:adjustmentsOf(project),variations:variationsOf(project)};
}
function exportXlsx():void{
  const project=activeProject();if(!project)return;
  const input=reportInput(project);if(!input)return;
  const bytes=buildXlsx(buildReportModel(input),language);
  const url=URL.createObjectURL(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  const a=document.createElement("a");a.href=url;a.download=`${project.name.replace(/[^\p{L}\p{N}-]+/gu,"-")}-boq.xlsx`;a.click();URL.revokeObjectURL(url);
}
function printReport():void{
  const project=activeProject();if(!project)return;
  const input=reportInput(project);if(!input)return;
  const html=renderReportHtml(buildReportModel(input),language);
  const win=window.open("","_blank");if(!win)return;
  win.document.open();win.document.write(html);win.document.close();win.focus();win.print();
}
render();
void initStorage();
