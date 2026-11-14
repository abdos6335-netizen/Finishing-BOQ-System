import { calculateRoomQuantities, type RoomInput } from "./domain/quantity-engine";
import { calculateBoq, calculateBoqItem, type BoqItemInput, type BoqUnit } from "./domain/boq-engine";
import { createId, loadProjects, saveProjects, type BuildingCondition, type ProjectRecord } from "./domain/project-store";
import { generateRoomBoqItems } from "./domain/room-boq-link";
import { IndexedDbProjectStorage, migrateFromLocalStorage, type ProjectStorage } from "./domain/storage";
import { buildReportModel, buildXlsx, renderReportHtml } from "./domain/report-export";
import { addVariationItem, adjustmentsOf, buildAdjustment, buildVariationItem, canDeleteVariation, createVariation, nextVariationNumber, projectFinancials, removeVariationItem, variationsOf } from "./domain/project-costing";
import { calculateVariation, transitionVariation, type VariationOrder, type VariationStatus } from "./domain/variation-orders";
import { addAssemblyComponent, addMepCableRun, addMepCircuit, addMepPoint, applyAssemblyToProject, assembliesOf, createAssembly, mepOf, mepSummary, removeAssemblyComponent, removeMepCableRun, removeMepCircuit, removeMepPoint, syncMepToBoq, toggleMepPointReviewed } from "./domain/project-takeoff";
import { addActivity, addRate, removeActivity, removeRate, scheduleOf, scheduleView, setCalendar, setRounding } from "./domain/project-schedule";
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
assemblies:"التجميعات (أنظمة التشطيب)",asmName:"اسم التجميع",asmCreate:"إنشاء تجميع",asmDelete:"حذف التجميع",asmApply:"تطبيق على كل الغرف",asmCode:"كود المكوّن",asmDescription:"الوصف",asmBasis:"أساس الحساب",bFloor:"مساحة الأرضية",bCeiling:"مساحة السقف",bWallNet:"صافي الحوائط",bWallGross:"إجمالي الحوائط",bPerimeter:"المحيط",asmRatio:"الكمية لكل وحدة أساس",asmRule:"مرجع القاعدة",asmAddComponent:"إضافة مكوّن",asmNone:"لا توجد تجميعات.",asmNoComponents:"لا توجد مكوّنات.",asmHint:"لا توجد نسب استهلاك افتراضية: كل مكوّن يحتاج نسبة ومرجع قاعدة. أي تعديل في التعريف يرفع رقم الإصدار.",asmApplied:"تمت الإضافة: {a} · تحديث: {u} · موجود: {p}",asmSkipped:"تم تخطي {n} (هندسة الحوائط ناقصة أو تحتاج مراجعة).",
mep:"أعمال الـ MEP (من مخططات معتمدة فقط)",mepHint:"لا تُحسب نقاط ولا دوائر من مساحة الغرفة. النقاط تحتاج مرجع مخطط، والدوائر تأتي من جدول دوائر، والكابلات من أطوال مسارات موثقة.",mepDiscipline:"التخصص",dElectrical:"كهرباء",dLowCurrent:"تيار خفيف",dPlumbing:"سباكة",dHvac:"تكييف",mepDevice:"نوع الجهاز",mepCount:"العدد",mepRoom:"الغرفة",mepNoRoom:"بدون",mepDrawing:"مرجع المخطط",mepSheet:"اللوحة",mepRevision:"الإصدار",mepReviewed:"تمت المراجعة",mepAddPoint:"إضافة نقطة",mepPoints:"النقاط",mepCircuits:"جدول الدوائر",mepPanel:"اللوحة الكهربائية",mepCircuit:"رقم الدائرة",mepSchedule:"مرجع الجدول",mepCircuitPoints:"النقاط على الدائرة",mepAddCircuit:"إضافة دائرة",mepCables:"الكابلات",mepSpec:"مواصفة الكابل",mepCores:"عدد الأسلاك",mepParallel:"مسارات متوازية",mepRoute:"مرجع المسار",mepSegments:"أطوال المقاطع (م) مفصولة بفواصل",mepAllowance:"سماحية (م)",mepAllowanceDesc:"وصف السماحية",mepAllowanceRef:"مرجع اعتماد السماحية",mepAddCable:"إضافة كابل",mepSync:"إرسال المعتمد إلى المقايسة",mepSynced:"أضيف {a} · تحدّث {u}",mepStale:"{n} بند MEP لم يعد معتمدًا ومازال في المقايسة: راجعه.",mepCircuitCount:"عدد الدوائر",mepFromSchedule:"من الجدول",mepNeedsReview:"يحتاج مراجعة",mepConductor:"طول الموصلات (م)",mepStatusOk:"مؤكد",mepNoPoints:"لا توجد نقاط.",mepNoCircuits:"لا توجد دوائر.",mepNoCables:"لا توجد كابلات.",mepUnscheduled:"نقاط كهرباء بدون دائرة",
schedule:"الجدول الزمني (المسار الحرج)",schHint:"لا توجد معدلات إنتاج مدمجة: كل معدل يحتاج مصدرًا وتاريخًا وموقعًا. كمية النشاط تُؤخذ من بند مقايسة. بدون معدل تبقى المدة غير مقدّرة ولا يُحسب المسار.",schRates:"معدلات الإنتاج",rateUnit:"الوحدة",rateBasis:"أساس المعدل",rbCrew:"لكل طاقم/يوم",rbWorker:"لكل عامل/يوم",rateValue:"الكمية في اليوم",prodSource:"مصدر المعدل",rateDate:"تاريخ المصدر",rateLocation:"الموقع",rateConfidence:"الثقة (0-1)",addRate:"إضافة معدل",noRates:"لا توجد معدلات.",schActivities:"الأنشطة",actName:"اسم النشاط",actItem:"بند المقايسة (الكمية)",actRate:"المعدل",actNoRate:"بدون معدل",actCrew:"حجم الطاقم (لكل عامل/يوم)",actPreds:"الأنشطة السابقة",actRel:"نوع العلاقة",actLag:"التأخير (أيام)",addActivity:"إضافة نشاط",noActivities:"لا توجد أنشطة.",schCalendar:"التقويم",calStart:"تاريخ البدء",calHolidays:"إجازات (yyyy-mm-dd مفصولة بفواصل)",calDays:"أيام العمل",saveCalendar:"حفظ التقويم",schRounding:"تقريب المدة",rndCeil:"لأعلى يوم كامل",rndNone:"بدون تقريب",schResult:"النتيجة",schDuration:"المدة",schStart:"بدء مبكر",schFinish:"انتهاء مبكر",schFloat:"الفائض",schCritical:"حرج",schProjectDuration:"مدة المشروع (أيام عمل)",schProjectFinish:"تاريخ الانتهاء",schIncomplete:"الجدول غير مكتمل: أنشطة بلا مدة مقدّرة.",schLogicOnly:"الفائض والحرج يصفان منطق الاعتماديات فقط (بدون موازنة موارد).",schNoCalendar:"أدخل التقويم لعرض التواريخ.",dow0:"أحد",dow1:"اثنين",dow2:"ثلاثاء",dow3:"أربعاء",dow4:"خميس",dow5:"جمعة",dow6:"سبت",
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
assemblies:"Assemblies (finishing systems)",asmName:"Assembly name",asmCreate:"Create assembly",asmDelete:"Delete assembly",asmApply:"Apply to all rooms",asmCode:"Component code",asmDescription:"Description",asmBasis:"Quantity basis",bFloor:"Floor area",bCeiling:"Ceiling area",bWallNet:"Net wall area",bWallGross:"Gross wall area",bPerimeter:"Perimeter",asmRatio:"Quantity per basis unit",asmRule:"Rule reference",asmAddComponent:"Add component",asmNone:"No assemblies yet.",asmNoComponents:"No components.",asmHint:"There are no default consumption ratios: every component needs a ratio and a rule reference. Any change to the definition bumps its version.",asmApplied:"Added: {a} · updated: {u} · already present: {p}",asmSkipped:"{n} skipped (wall geometry missing or needs review).",
mep:"MEP works (approved drawings only)",mepHint:"Points and circuits are never derived from room area. Points need a drawing reference, circuits come from a circuit schedule, and cables from documented route lengths.",mepDiscipline:"Discipline",dElectrical:"Electrical",dLowCurrent:"Low current",dPlumbing:"Plumbing",dHvac:"HVAC",mepDevice:"Device type",mepCount:"Count",mepRoom:"Room",mepNoRoom:"None",mepDrawing:"Drawing reference",mepSheet:"Sheet",mepRevision:"Revision",mepReviewed:"Reviewed",mepAddPoint:"Add point",mepPoints:"Points",mepCircuits:"Circuit schedule",mepPanel:"Panel",mepCircuit:"Circuit",mepSchedule:"Schedule reference",mepCircuitPoints:"Points on circuit",mepAddCircuit:"Add circuit",mepCables:"Cables",mepSpec:"Cable specification",mepCores:"Cores",mepParallel:"Parallel runs",mepRoute:"Route reference",mepSegments:"Segment lengths (m), comma separated",mepAllowance:"Allowance (m)",mepAllowanceDesc:"Allowance description",mepAllowanceRef:"Allowance approval reference",mepAddCable:"Add cable",mepSync:"Send verified items to BOQ",mepSynced:"Added {a} · updated {u}",mepStale:"{n} MEP BOQ line(s) are no longer verified but remain in the BOQ: review them.",mepCircuitCount:"Circuits",mepFromSchedule:"From schedule",mepNeedsReview:"Needs review",mepConductor:"Conductor length (m)",mepStatusOk:"Verified",mepNoPoints:"No points.",mepNoCircuits:"No circuits.",mepNoCables:"No cables.",mepUnscheduled:"Electrical points without a circuit",
schedule:"Schedule (critical path)",schHint:"There are no built-in productivity rates: every rate needs a source, date and location. An activity's quantity comes from a BOQ line. Without a rate the duration stays unestimated and no path is computed.",schRates:"Productivity rates",rateUnit:"Unit",rateBasis:"Rate basis",rbCrew:"Per crew-day",rbWorker:"Per worker-day",rateValue:"Quantity per day",prodSource:"Rate source",rateDate:"Source date",rateLocation:"Location",rateConfidence:"Confidence (0-1)",addRate:"Add rate",noRates:"No rates.",schActivities:"Activities",actName:"Activity name",actItem:"BOQ item (quantity)",actRate:"Rate",actNoRate:"No rate",actCrew:"Crew size (per-worker-day)",actPreds:"Predecessors",actRel:"Relationship",actLag:"Lag (days)",addActivity:"Add activity",noActivities:"No activities.",schCalendar:"Calendar",calStart:"Start date",calHolidays:"Holidays (yyyy-mm-dd, comma separated)",calDays:"Working days",saveCalendar:"Save calendar",schRounding:"Duration rounding",rndCeil:"Up to whole days",rndNone:"No rounding",schResult:"Result",schDuration:"Duration",schStart:"Early start",schFinish:"Early finish",schFloat:"Float",schCritical:"Critical",schProjectDuration:"Project duration (working days)",schProjectFinish:"Finish date",schIncomplete:"The schedule is incomplete: some activities have no estimated duration.",schLogicOnly:"Float and criticality describe dependency logic only (no resource levelling).",schNoCalendar:"Enter the calendar to see dates.",dow0:"Sun",dow1:"Mon",dow2:"Tue",dow3:"Wed",dow4:"Thu",dow5:"Fri",dow6:"Sat",
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
  const asmPanel=document.querySelector<HTMLElement>("#assembly-panel");
  asmPanel?.addEventListener("submit",assemblySubmitHandler);
  asmPanel?.addEventListener("click",assemblyClickHandler);
  const mepPanel=document.querySelector<HTMLElement>("#mep-panel");
  mepPanel?.addEventListener("submit",mepSubmitHandler);
  mepPanel?.addEventListener("click",mepClickHandler);
  const schPanel=document.querySelector<HTMLElement>("#schedule-panel");
  schPanel?.addEventListener("submit",scheduleSubmitHandler);
  schPanel?.addEventListener("click",scheduleClickHandler);
  schPanel?.addEventListener("change",scheduleChangeHandler);
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
    </section>${renderBoq(project)}${renderAssemblies(project)}${renderMep(project)}${renderSchedule(project)}${renderCosting(project)}${renderVariations(project)}`;
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

const BASIS_LABELS:Record<string,keyof typeof copy.ar>={"floor-area":"bFloor","ceiling-area":"bCeiling","wall-net-area":"bWallNet","wall-gross-area":"bWallGross",perimeter:"bPerimeter"};
const DISCIPLINE_LABELS:Record<string,keyof typeof copy.ar>={electrical:"dElectrical","low-current":"dLowCurrent",plumbing:"dPlumbing",hvac:"dHvac"};
function fill(text:string,values:Record<string,number>):string{return text.replace(/\{(\w+)\}/g,(_m,key:string)=>String(values[key]??""));}
function disciplineOptions():string{return Object.keys(DISCIPLINE_LABELS).map(key=>`<option value="${key}">${t(DISCIPLINE_LABELS[key])}</option>`).join("");}

function renderAssemblies(project:ProjectRecord):string{
  const unitOptions=`<option value="m2">m²</option><option value="m">m</option><option value="m3">m³</option><option value="pcs">pcs</option>`;
  const basisOptions=Object.keys(BASIS_LABELS).map(key=>`<option value="${key}">${t(BASIS_LABELS[key])}</option>`).join("");
  const cards=assembliesOf(project).map(def=>{
    const rows=def.components.map(c=>`<tr><td>${escapeHtml(c.code)}</td><td>${escapeHtml(c.description)}<small>${escapeHtml(c.ruleRef)}</small></td><td>${t(BASIS_LABELS[c.basis])}</td><td>${c.quantityPerBasisUnit} ${c.unit}</td><td><button class="text-button danger" data-asm-remove-component="${escapeHtml(c.id)}" data-asm-id="${escapeHtml(def.id)}">${t("remove")}</button></td></tr>`).join("");
    return `<article class="room-editor"><div class="room-editor-head"><div><strong>${escapeHtml(def.name)}</strong><small>v${def.version}</small></div><div class="actions"><button class="outline" data-asm-apply="${escapeHtml(def.id)}" ${def.components.length===0?"disabled":""}>${t("asmApply")}</button><button class="text-button danger" data-asm-delete="${escapeHtml(def.id)}">${t("asmDelete")}</button></div></div>
      <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("asmCode")}</th><th>${t("asmDescription")}</th><th>${t("asmBasis")}</th><th>${t("asmRatio")}</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="5" class="muted">${t("asmNoComponents")}</td></tr>`}</tbody></table></div>
      <form class="boq-form asm-component-form" data-asm-id="${escapeHtml(def.id)}">
        <label>${t("asmCode")}<input name="code" required maxlength="30"/></label>
        <label>${t("asmDescription")}<input name="description" required maxlength="160"/></label>
        <label>${t("boqUnit")}<select name="unit">${unitOptions}</select></label>
        <label>${t("asmBasis")}<select name="basis">${basisOptions}</select></label>
        <label>${t("asmRatio")}<input name="quantityPerBasisUnit" type="number" min="0" step="0.0001" required/></label>
        <label>${t("asmRule")}<input name="ruleRef" required maxlength="160"/></label>
        <button class="primary" type="submit">${t("asmAddComponent")}</button></form></article>`;
  }).join("")||`<p class="muted">${t("asmNone")}</p>`;
  return `<section class="panel boq-panel" id="assembly-panel"><div class="panel-head"><div><span class="eyebrow">ASSEMBLIES</span><h2>${t("assemblies")}</h2></div></div>
    <form id="assembly-form" class="boq-form"><label>${t("asmName")}<input name="name" required maxlength="80"/></label><button class="primary" type="submit">${t("asmCreate")}</button></form>
    <p class="hint">${t("asmHint")}</p><p id="assembly-message" class="hint"></p>${cards}</section>`;
}

function assemblySubmitHandler(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  const project=activeProject();if(!project)return;const data=new FormData(form);
  try{
    if(form.id==="assembly-form"){
      event.preventDefault();
      project.assemblies=[...assembliesOf(project),createAssembly(assembliesOf(project),field(data,"name"),createId())];persist();return;
    }
    if(form.classList.contains("asm-component-form")){
      event.preventDefault();
      const def=assembliesOf(project).find(item=>item.id===form.dataset.asmId);if(!def)return;
      const updated=addAssemblyComponent(def,{code:field(data,"code"),description:field(data,"description"),unit:field(data,"unit"),basis:field(data,"basis"),quantityPerBasisUnit:field(data,"quantityPerBasisUnit"),ruleRef:field(data,"ruleRef")},createId());
      project.assemblies=assembliesOf(project).map(item=>item.id===def.id?updated:item);persist();
    }
  }catch(error){showError(error);}
}
function assemblyClickHandler(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const button=target.closest<HTMLButtonElement>("[data-asm-apply],[data-asm-delete],[data-asm-remove-component]");if(!button)return;
  const project=activeProject();if(!project)return;
  try{
    if(button.dataset.asmDelete){project.assemblies=assembliesOf(project).filter(item=>item.id!==button.dataset.asmDelete);persist();return;}
    if(button.dataset.asmRemoveComponent){
      const def=assembliesOf(project).find(item=>item.id===button.dataset.asmId);if(!def)return;
      project.assemblies=assembliesOf(project).map(item=>item.id===def.id?removeAssemblyComponent(def,button.dataset.asmRemoveComponent as string):item);persist();return;
    }
    if(button.dataset.asmApply){
      const {items,result}=applyAssemblyToProject(project,button.dataset.asmApply,createId);
      project.boqItems=items;persist();
      const lines=[fill(t("asmApplied"),{a:result.addedItems.length,u:result.updatedItems.length,p:result.alreadyPresentCount})];
      if(result.skipped.length)lines.push(fill(t("asmSkipped"),{n:result.skipped.length}));
      lines.push(...result.overlapWarnings);
      window.alert(lines.join("\n"));
    }
  }catch(error){showError(error);}
}

function renderMep(project:ProjectRecord):string{
  const mep=mepOf(project);
  let summary;try{summary=mepSummary(project);}catch(error){return `<section class="panel boq-panel"><p class="warn">${escapeHtml(error instanceof Error?error.message:t("createError"))}</p></section>`;}
  const roomOptions=`<option value="">${t("mepNoRoom")}</option>`+project.rooms.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}</option>`).join("");
  const roomName=(id?:string)=>project.rooms.find(r=>r.id===id)?.name??"—";
  const pointRows=mep.points.map(pt=>`<tr><td>${t(DISCIPLINE_LABELS[pt.discipline])}</td><td>${escapeHtml(pt.deviceType)}<small>${escapeHtml(pt.drawingRef)}${pt.sheet?` · ${escapeHtml(pt.sheet)}`:""}${pt.revision?` · ${escapeHtml(pt.revision)}`:""}</small></td><td>${pt.count}</td><td>${escapeHtml(roomName(pt.roomId))}</td><td><label class="check-label"><input type="checkbox" data-mep-review="${escapeHtml(pt.id)}" ${pt.reviewed?"checked":""}/> ${t("mepReviewed")}</label></td><td><button class="text-button danger" data-mep-remove-point="${escapeHtml(pt.id)}">${t("remove")}</button></td></tr>`).join("");
  const pointChoices=mep.points.map(pt=>`<label class="check-label"><input type="checkbox" name="pointIds" value="${escapeHtml(pt.id)}"/> ${escapeHtml(pt.deviceType)} ×${pt.count} (${escapeHtml(pt.drawingRef)})</label>`).join("");
  const circuitRows=mep.circuits.map(c=>`<tr><td>${escapeHtml(c.panelRef)} / ${escapeHtml(c.circuitRef)}<small>${escapeHtml(c.scheduleRef)}</small></td><td>${c.pointIds.length}</td><td><button class="text-button danger" data-mep-remove-circuit="${escapeHtml(c.id)}">${t("remove")}</button></td></tr>`).join("");
  const cableRows=summary.cableRuns.map(r=>`<tr><td>${escapeHtml(r.spec)}<small>${escapeHtml(r.routeRef)}</small></td><td>${r.routeLengthM} + ${r.allowanceLengthM}</td><td>${r.conductorLengthM}</td><td class="${r.status==="verified"?"good":"warn"}">${r.status==="verified"?t("mepStatusOk"):escapeHtml(r.checks.join(" "))}</td><td><button class="text-button danger" data-mep-remove-cable="${escapeHtml(r.id)}">${t("remove")}</button></td></tr>`).join("");
  const totals=summary.pointTotals.map(x=>`<tr><td>${t(DISCIPLINE_LABELS[x.discipline])}</td><td>${escapeHtml(x.deviceType)}</td><td>${x.totalCount}</td><td class="${x.status==="verified"?"good":"warn"}">${x.status==="verified"?t("mepStatusOk"):t("mepNeedsReview")}</td></tr>`).join("");
  return `<section class="panel boq-panel" id="mep-panel"><div class="panel-head"><div><span class="eyebrow">MEP TAKEOFF</span><h2>${t("mep")}</h2></div><button class="outline" data-mep-sync="1">${t("mepSync")}</button></div>
    <p class="hint">${t("mepHint")}</p>
    <h3>${t("mepPoints")}</h3>
    <form id="mep-point-form" class="boq-form">
      <label>${t("mepDiscipline")}<select name="discipline">${disciplineOptions()}</select></label>
      <label>${t("mepDevice")}<input name="deviceType" required maxlength="80"/></label>
      <label>${t("mepCount")}<input name="count" type="number" min="0" step="1" required/></label>
      <label>${t("mepRoom")}<select name="roomId">${roomOptions}</select></label>
      <label>${t("mepDrawing")}<input name="drawingRef" required maxlength="160"/></label>
      <label>${t("mepSheet")}<input name="sheet" maxlength="40"/></label>
      <label>${t("mepRevision")}<input name="revision" maxlength="40"/></label>
      <label class="check-label"><input name="reviewed" type="checkbox"/> ${t("mepReviewed")}</label>
      <button class="primary" type="submit">${t("mepAddPoint")}</button></form>
    <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("mepDiscipline")}</th><th>${t("mepDevice")}</th><th>${t("mepCount")}</th><th>${t("mepRoom")}</th><th></th><th></th></tr></thead><tbody>${pointRows||`<tr><td colspan="6" class="muted">${t("mepNoPoints")}</td></tr>`}</tbody></table></div>
    ${totals?`<div class="boq-table-wrap"><table class="boq-table"><tbody>${totals}</tbody></table></div>`:""}
    <h3>${t("mepCircuits")}</h3>
    <form id="mep-circuit-form" class="boq-form">
      <label>${t("mepPanel")}<input name="panelRef" required maxlength="40"/></label>
      <label>${t("mepCircuit")}<input name="circuitRef" required maxlength="40"/></label>
      <label>${t("mepSchedule")}<input name="scheduleRef" required maxlength="160"/></label>
      <fieldset class="point-choices"><legend>${t("mepCircuitPoints")}</legend>${pointChoices||`<span class="muted">${t("mepNoPoints")}</span>`}</fieldset>
      <button class="primary" type="submit">${t("mepAddCircuit")}</button></form>
    <p class="hint ${summary.circuitStatus==="from-schedule"?"good":"warn"}">${t("mepCircuitCount")}: ${summary.circuitCount===null?t("mepNeedsReview"):`${summary.circuitCount} (${t("mepFromSchedule")})`}${summary.unscheduledPointIds.length?` · ${t("mepUnscheduled")}: ${summary.unscheduledPointIds.length}`:""}</p>
    <div class="boq-table-wrap"><table class="boq-table"><tbody>${circuitRows||`<tr><td class="muted">${t("mepNoCircuits")}</td></tr>`}</tbody></table></div>
    <h3>${t("mepCables")}</h3>
    <form id="mep-cable-form" class="boq-form">
      <label>${t("mepDiscipline")}<select name="discipline">${disciplineOptions()}</select></label>
      <label>${t("mepSpec")}<input name="spec" required maxlength="100"/></label>
      <label>${t("mepCores")}<input name="cores" type="number" min="1" step="1" required/></label>
      <label>${t("mepParallel")}<input name="parallelRuns" type="number" min="1" step="1" value="1" required/></label>
      <label>${t("mepRoute")}<input name="routeRef" required maxlength="160"/></label>
      <label>${t("mepSegments")}<input name="segments" required/></label>
      <label>${t("mepAllowance")}<input name="allowanceLength" type="number" min="0" step="0.01"/></label>
      <label>${t("mepAllowanceDesc")}<input name="allowanceDescription" maxlength="120"/></label>
      <label>${t("mepAllowanceRef")}<input name="allowanceApprovalRef" maxlength="160"/></label>
      <button class="primary" type="submit">${t("mepAddCable")}</button></form>
    <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("mepSpec")}</th><th>m + ${t("mepAllowance")}</th><th>${t("mepConductor")}</th><th></th><th></th></tr></thead><tbody>${cableRows||`<tr><td colspan="5" class="muted">${t("mepNoCables")}</td></tr>`}</tbody></table></div>
    ${summary.checks.length?`<ul class="validation-list">${summary.checks.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>`:""}
  </section>`;
}

function mepSubmitHandler(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  const project=activeProject();if(!project)return;const data=new FormData(form);const mep=mepOf(project);
  try{
    if(form.id==="mep-point-form"){
      event.preventDefault();
      project.mep=addMepPoint(mep,{discipline:field(data,"discipline"),deviceType:field(data,"deviceType"),count:field(data,"count"),roomId:field(data,"roomId"),drawingRef:field(data,"drawingRef"),sheet:field(data,"sheet"),revision:field(data,"revision"),reviewed:data.get("reviewed")==="on"},createId());persist();return;
    }
    if(form.id==="mep-circuit-form"){
      event.preventDefault();
      project.mep=addMepCircuit(mep,{panelRef:field(data,"panelRef"),circuitRef:field(data,"circuitRef"),scheduleRef:field(data,"scheduleRef"),pointIds:data.getAll("pointIds").map(String)},createId());persist();return;
    }
    if(form.id==="mep-cable-form"){
      event.preventDefault();
      project.mep=addMepCableRun(mep,{discipline:field(data,"discipline"),spec:field(data,"spec"),cores:field(data,"cores"),parallelRuns:field(data,"parallelRuns"),routeRef:field(data,"routeRef"),segments:field(data,"segments"),allowanceLength:field(data,"allowanceLength"),allowanceDescription:field(data,"allowanceDescription"),allowanceApprovalRef:field(data,"allowanceApprovalRef")},createId());persist();
    }
  }catch(error){showError(error);}
}
function mepClickHandler(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const project=activeProject();if(!project)return;const mep=mepOf(project);
  try{
    if(target instanceof HTMLInputElement&&target.dataset.mepReview){project.mep=toggleMepPointReviewed(mep,target.dataset.mepReview);persist();return;}
    const button=target.closest<HTMLButtonElement>("[data-mep-remove-point],[data-mep-remove-circuit],[data-mep-remove-cable],[data-mep-sync]");if(!button)return;
    if(button.dataset.mepRemovePoint){project.mep=removeMepPoint(mep,button.dataset.mepRemovePoint);persist();return;}
    if(button.dataset.mepRemoveCircuit){project.mep=removeMepCircuit(mep,button.dataset.mepRemoveCircuit);persist();return;}
    if(button.dataset.mepRemoveCable){project.mep=removeMepCableRun(mep,button.dataset.mepRemoveCable);persist();return;}
    if(button.dataset.mepSync){
      const sync=syncMepToBoq(project,createId);project.boqItems=sync.items;persist();
      const lines=[fill(t("mepSynced"),{a:sync.added,u:sync.updated})];
      if(sync.staleCount)lines.push(fill(t("mepStale"),{n:sync.staleCount}));
      window.alert(lines.join("\n"));
    }
  }catch(error){showError(error);}
}

function renderSchedule(project:ProjectRecord):string{
  const sch=scheduleOf(project);
  let view;try{view=scheduleView(project);}catch(error){return `<section class="panel boq-panel" id="schedule-panel"><p class="warn">${escapeHtml(error instanceof Error?error.message:t("createError"))}</p></section>`;}
  const unitOpts=`<option value="m2">m²</option><option value="m">m</option><option value="m3">m³</option><option value="pcs">pcs</option>`;
  const rateRows=sch.rates.map(r=>`<tr><td>${r.value} ${r.unit} · ${r.basis==="per-crew-day"?t("rbCrew"):t("rbWorker")}</td><td>${escapeHtml(r.sourceRef)}<small>${escapeHtml(r.sourceDate)} · ${escapeHtml(r.location)}</small></td><td><button class="text-button danger" data-sch-remove-rate="${escapeHtml(r.id)}">${t("remove")}</button></td></tr>`).join("");
  const rateOpts=`<option value="">${t("actNoRate")}</option>`+sch.rates.map(r=>`<option value="${escapeHtml(r.id)}">${r.value} ${r.unit} · ${escapeHtml(r.sourceRef)}</option>`).join("");
  const itemOpts=project.boqItems.map(i=>`<option value="${escapeHtml(i.id)}">${escapeHtml(i.code)} · ${escapeHtml(i.description)} (${i.netQuantity} ${i.unit})</option>`).join("");
  const predChoices=sch.activities.map(a=>`<label class="check-label"><input type="checkbox" name="predecessorIds" value="${escapeHtml(a.id)}"/> ${escapeHtml(a.name)}</label>`).join("");
  const cpmById=new Map((view.estimate.cpm?.rows??[]).map(row=>[row.id,row]));
  const actRows=sch.activities.map(a=>{
    const row=cpmById.get(a.id),range=view.dates.get(a.id);
    return `<tr class="${row?.critical?"critical-row":""}"><td>${escapeHtml(a.name)}<small>${a.quantity} ${a.unit} · ${escapeHtml(a.quantitySourceRef)}</small></td><td>${row?row.durationDays:"—"}</td><td>${range?range.start:row?row.earlyStart:"—"}</td><td>${range?range.finish:row?row.earlyFinish:"—"}</td><td>${row?row.totalFloat:"—"}</td><td class="${row?.critical?"warn":""}">${row?.critical?t("schCritical"):""}</td><td><button class="text-button danger" data-sch-remove-activity="${escapeHtml(a.id)}">${t("remove")}</button></td></tr>`;
  }).join("");
  const days=[0,1,2,3,4,5,6].map(d=>`<label class="check-label"><input type="checkbox" name="weekdays" value="${d}" ${sch.calendar?.workingWeekdays.includes(d)?"checked":""}/> ${t(`dow${d}` as keyof typeof copy.ar)}</label>`).join("");
  const cpm=view.estimate.cpm;
  return `<section class="panel boq-panel" id="schedule-panel"><div class="panel-head"><div><span class="eyebrow">SCHEDULE</span><h2>${t("schedule")}</h2></div></div>
    <p class="hint">${t("schHint")}</p>
    <h3>${t("schRates")}</h3>
    <form id="rate-form" class="boq-form">
      <label>${t("rateUnit")}<select name="unit">${unitOpts}</select></label>
      <label>${t("rateBasis")}<select name="basis"><option value="per-crew-day">${t("rbCrew")}</option><option value="per-worker-day">${t("rbWorker")}</option></select></label>
      <label>${t("rateValue")}<input name="value" type="number" min="0" step="0.0001" required/></label>
      <label>${t("prodSource")}<input name="sourceRef" required maxlength="160"/></label>
      <label>${t("rateDate")}<input name="sourceDate" type="date" required/></label>
      <label>${t("rateLocation")}<input name="location" required maxlength="80"/></label>
      <label>${t("rateConfidence")}<input name="confidence" type="number" min="0" max="1" step="0.01"/></label>
      <button class="primary" type="submit">${t("addRate")}</button></form>
    <div class="boq-table-wrap"><table class="boq-table"><tbody>${rateRows||`<tr><td class="muted">${t("noRates")}</td></tr>`}</tbody></table></div>
    <h3>${t("schCalendar")}</h3>
    <form id="calendar-form" class="boq-form">
      <label>${t("calStart")}<input name="startDate" type="date" required value="${escapeHtml(sch.calendar?.startDate??"")}"/></label>
      <fieldset class="point-choices"><legend>${t("calDays")}</legend>${days}</fieldset>
      <label>${t("calHolidays")}<input name="holidays" value="${escapeHtml((sch.calendar?.holidays??[]).join(", "))}"/></label>
      <button class="primary" type="submit">${t("saveCalendar")}</button></form>
    <label class="currency-label">${t("schRounding")}<select id="rounding-select"><option value="ceil" ${sch.rounding==="ceil"?"selected":""}>${t("rndCeil")}</option><option value="none" ${sch.rounding==="none"?"selected":""}>${t("rndNone")}</option></select></label>
    <h3>${t("schActivities")}</h3>
    <form id="activity-form" class="boq-form">
      <label>${t("actName")}<input name="name" required maxlength="100"/></label>
      <label>${t("actItem")}<select name="boqItemId" required>${itemOpts}</select></label>
      <label>${t("actRate")}<select name="rateId">${rateOpts}</select></label>
      <label>${t("actCrew")}<input name="crewSize" type="number" min="0" step="1"/></label>
      <fieldset class="point-choices"><legend>${t("actPreds")}</legend>${predChoices||`<span class="muted">—</span>`}</fieldset>
      <label>${t("actRel")}<select name="relationship"><option value="FS">FS</option><option value="SS">SS</option><option value="FF">FF</option></select></label>
      <label>${t("actLag")}<input name="lagDays" type="number" step="0.5" value="0"/></label>
      <button class="primary" type="submit">${t("addActivity")}</button></form>
    ${cpm?`<div class="boq-summary"><div><span>${t("schProjectDuration")}</span><strong>${cpm.projectDurationDays}</strong></div>${view.projectFinish?`<div><span>${t("schProjectFinish")}</span><strong>${view.projectFinish}</strong></div>`:`<div><span>${t("schProjectFinish")}</span><strong>—</strong></div>`}</div>${view.projectFinish?"":`<p class="hint warn">${t("schNoCalendar")}</p>`}<p class="hint">${t("schLogicOnly")}</p>`:(sch.activities.length?`<p class="hint warn">${t("schIncomplete")}</p>`:"")}
    <div class="boq-table-wrap"><table class="boq-table"><thead><tr><th>${t("schActivities")}</th><th>${t("schDuration")}</th><th>${t("schStart")}</th><th>${t("schFinish")}</th><th>${t("schFloat")}</th><th></th><th></th></tr></thead><tbody>${actRows||`<tr><td colspan="7" class="muted">${t("noActivities")}</td></tr>`}</tbody></table></div>
    ${view.estimate.checks.length?`<ul class="validation-list">${view.estimate.checks.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>`:""}
  </section>`;
}

function scheduleSubmitHandler(event:SubmitEvent):void{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  const project=activeProject();if(!project)return;const data=new FormData(form);
  try{
    if(form.id==="rate-form"){event.preventDefault();project.schedule=addRate(scheduleOf(project),{unit:field(data,"unit"),basis:field(data,"basis"),value:field(data,"value"),sourceRef:field(data,"sourceRef"),sourceDate:field(data,"sourceDate"),location:field(data,"location"),confidence:field(data,"confidence")},createId());persist();return;}
    if(form.id==="calendar-form"){event.preventDefault();project.schedule=setCalendar(scheduleOf(project),{startDate:field(data,"startDate"),weekdays:data.getAll("weekdays").map(Number),holidays:field(data,"holidays")});persist();return;}
    if(form.id==="activity-form"){event.preventDefault();project.schedule=addActivity(project,{name:field(data,"name"),boqItemId:field(data,"boqItemId"),rateId:field(data,"rateId"),crewSize:field(data,"crewSize"),predecessorIds:data.getAll("predecessorIds").map(String),relationship:field(data,"relationship"),lagDays:field(data,"lagDays")},createId());persist();}
  }catch(error){showError(error);}
}
function scheduleClickHandler(event:MouseEvent):void{
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const button=target.closest<HTMLButtonElement>("[data-sch-remove-rate],[data-sch-remove-activity]");if(!button)return;
  const project=activeProject();if(!project)return;
  try{
    if(button.dataset.schRemoveRate){project.schedule=removeRate(scheduleOf(project),button.dataset.schRemoveRate);persist();return;}
    if(button.dataset.schRemoveActivity){project.schedule=removeActivity(scheduleOf(project),button.dataset.schRemoveActivity);persist();}
  }catch(error){showError(error);}
}
function scheduleChangeHandler(event:Event):void{
  const target=event.target;if(!(target instanceof HTMLSelectElement)||target.id!=="rounding-select")return;
  const project=activeProject();if(!project)return;
  try{project.schedule=setRounding(scheduleOf(project),target.value);persist();}catch(error){showError(error);}
}

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
