import { calculateRoomQuantities, type RoomInput } from "./domain/quantity-engine";
import { calculateBoq, calculateBoqItem, type BoqItemInput, type BoqUnit } from "./domain/boq-engine";
import { createId, loadProjects, saveProjects, type BuildingCondition, type ProjectRecord } from "./domain/project-store";
import "./style.css";

let projects = loadProjects();
let activeProjectId = projects[0]?.id ?? "";
let language: "ar" | "en" = "ar";
const copy = {
  ar: {
    brand:"FINISHING BOQ",subtitle:"نظام حصر كميات ومقايسات التشطيبات",projects:"المشروعات",newProject:"مشروع جديد",projectName:"اسم المشروع",
    type:"نوع المشروع",apartment:"شقة",villa:"فيلا",buildingCondition:"حالة المبنى",brick:"مبنى على الطوب الأحمر (بدون تشطيب)",renovation:"تجديد وإعادة تشطيب",plaster:"محارة فقط",semiFinished:"نصف تشطيب",fullyFinished:"متشطب بالكامل",alteration:"تعديل تقسيمات داخلية وهدم وبناء جديد",shell:"هيكل خرساني (Concrete Shell)",unspecified:"غير محددة / مشروع قديم",create:"إنشاء المشروع",room:"إضافة غرفة",roomName:"اسم الغرفة",length:"الطول (م)",width:"العرض (م)",
    height:"الارتفاع (م)",addRoom:"حفظ الغرفة",overview:"ملخص المشروع",floor:"مساحة الأرضيات",walls:"صافي الحوائط",ceiling:"مساحة الأسقف",
    gross:"إجمالي الحوائط",deductions:"خصم الفتحات",perimeter:"المحيط",rooms:"الغرف",empty:"ابدأ بإنشاء مشروع ثم أضف الغرف لعرض الحصر.",
    noRooms:"لا توجد غرف مضافة بعد.",verified:"اجتاز المراجعة الحسابية",review:"يحتاج مراجعة",export:"تصدير CSV",language:"English",
    disclaimer:"نسخة تأسيسية: لا تعتمد النتائج كمقايسة تنفيذية قبل مراجعة الأبعاد وقواعد الخصم ومصدر الرسومات.",
    wallFace:"وجه حائط",addWallFace:"إضافة وجه حائط",faceLength:"طول الوجه (م)",faceHeight:"ارتفاع الوجه (م)",opening:"فتحة",addOpening:"إضافة فتحة",
    deduct:"تُخصم من المساحة",noFaces:"لم تُسجل أوجه حوائط مقاسة بعد.",remove:"حذف",measuredFaces:"أوجه الحوائط المقاسة",openings:"الفتحات",createError:"راجع القيم المدخلة.",boq:"بنود المقايسة",boqCode:"كود البند",boqDescription:"وصف البند",boqUnit:"الوحدة",boqQuantity:"الكمية الصافية",boqSource:"مرجع مصدر الكمية",wasteRate:"هالك معتمد %",wasteApproval:"مرجع اعتماد الهالك",unitRate:"سعر الوحدة",rateSource:"مرجع السعر",costBasis:"أساس التسعير",netBasis:"صافي الكمية",orderBasis:"كمية التوريد",addBoq:"إضافة بند",subtotal:"إجمالي البنود المسعرة",unpriced:"بنود بلا تسعير",lineTotal:"الإجمالي",removeItem:"حذف البند",boqStatus:"حالة المراجعة"
  },
  en: {
    brand:"FINISHING BOQ",subtitle:"Finishing Quantity Survey & Cost Estimation",projects:"Projects",newProject:"New project",projectName:"Project name",
    type:"Project type",apartment:"Apartment",villa:"Villa",buildingCondition:"Existing building condition",brick:"Red brick / unfinished",renovation:"Renovation & refit",plaster:"Plaster only",semiFinished:"Semi-finished",fullyFinished:"Fully finished",alteration:"Internal alterations, demolition & new walls",shell:"New concrete shell",unspecified:"Unspecified / legacy project",create:"Create project",room:"Add room",roomName:"Room name",length:"Length (m)",width:"Width (m)",
    height:"Height (m)",addRoom:"Save room",overview:"Project overview",floor:"Floor area",walls:"Net wall area",ceiling:"Ceiling area",
    gross:"Gross walls",deductions:"Opening deductions",perimeter:"Perimeter",rooms:"Rooms",empty:"Create a project, then add rooms to see the takeoff.",
    noRooms:"No rooms added yet.",verified:"Arithmetic checks passed",review:"Needs review",export:"Export CSV",language:"العربية",
    disclaimer:"Foundation build: do not use as an execution BOQ until dimensions, deduction rules, and drawing sources are reviewed.",
    wallFace:"Wall face",addWallFace:"Add wall face",faceLength:"Face length (m)",faceHeight:"Face height (m)",opening:"Opening",addOpening:"Add opening",
    deduct:"Deduct from wall area",noFaces:"No measured wall faces have been entered yet.",remove:"Remove",measuredFaces:"Measured wall faces",openings:"Openings",createError:"Check the entered values.",boq:"Bill of Quantities",boqCode:"Item code",boqDescription:"Item description",boqUnit:"Unit",boqQuantity:"Net quantity",boqSource:"Quantity source reference",wasteRate:"Approved waste %",wasteApproval:"Waste approval reference",unitRate:"Unit rate",rateSource:"Rate source reference",costBasis:"Cost basis",netBasis:"Net quantity",orderBasis:"Order quantity",addBoq:"Add BOQ item",subtotal:"Priced subtotal",unpriced:"Unpriced items",lineTotal:"Line total",removeItem:"Remove item",boqStatus:"Review status"
  }
};
function t(key:keyof typeof copy.ar):string{return copy[language][key];}
function el<T extends HTMLElement>(selector:string):T{const node=document.querySelector<T>(selector);if(!node)throw new Error(`Missing element: ${selector}`);return node;}
function escapeHtml(value:string):string{return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));}
function activeProject():ProjectRecord|undefined{return projects.find(p=>p.id===activeProjectId);}
function persist():void{saveProjects(projects);render();}

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
  document.querySelector<HTMLDivElement>("#boq-items")?.addEventListener("click",removeBoqItem);
  document.querySelector<HTMLDivElement>("#room-editor-list")?.addEventListener("submit",editRoom);
  document.querySelector<HTMLDivElement>("#room-editor-list")?.addEventListener("click",removeRoomItem);
  document.querySelector<HTMLButtonElement>("#export-csv")?.addEventListener("click",exportCsv);
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
      <div class="panel"><div class="panel-head"><div><span class="eyebrow">PROJECT DATA</span><h2>${t("overview")}</h2></div><button class="outline" id="export-csv">${t("export")}</button></div>
        <div class="mini-metrics"><div><span>${t("gross")}</span><strong>${total("wallGrossAreaM2").toFixed(2)} m²</strong></div><div><span>${t("deductions")}</span><strong>${total("openingDeductionM2").toFixed(2)} m²</strong></div></div>
        <div class="room-list"><h3>${t("rooms")} · ${project.rooms.length}</h3>
          ${results.length?results.map(({room,result})=>`<div class="room-row"><div><strong>${escapeHtml(room.name)}</strong><small>${room.lengthM} × ${room.widthM} × ${room.heightM} m · ${room.wallFaces.length} ${t("measuredFaces")}</small></div><div class="room-values"><strong>${result.floorAreaM2.toFixed(2)} m²</strong><small class="${result.verification==="matched"?"good":"warn"}">${result.verification==="matched"?t("verified"):t("review")}</small></div></div>`).join(""):`<p class="muted">${t("noRooms")}</p>`}
        </div>
      </div>
    </section>
    <section class="panel room-editor-panel"><div class="panel-head"><div><span class="eyebrow">MEASURED GEOMETRY</span><h2>${t("measuredFaces")} &amp; ${t("openings")}</h2></div></div>
      <div id="room-editor-list">${project.rooms.map(renderRoomEditor).join("")||`<p class="muted">${t("noRooms")}</p>`}</div>
    </section>${renderBoq(project)}`;
}
function renderBoq(project:ProjectRecord):string{
  const summary=calculateBoq(project.boqItems);
  const rows=summary.items.map(item=>"<tr><td>"+escapeHtml(item.code)+"</td><td>"+escapeHtml(item.description)+"<small>"+escapeHtml(item.sourceRef)+"</small></td><td>"+item.netQuantity.toFixed(2)+" "+item.unit+"</td><td>"+(item.wasteRatePct===null?"—":item.wasteRatePct+"%")+"</td><td>"+(item.unitRate===null?"—":item.unitRate.toFixed(2))+"</td><td>"+(item.lineTotal===null?"—":item.lineTotal.toFixed(2))+"</td><td class=\""+(item.status==="verified"?"good":"warn")+"\">"+(item.status==="verified"?t("verified"):t("review"))+"</td><td><button class=\"text-button danger\" data-remove-boq=\""+escapeHtml(item.id)+"\">"+t("removeItem")+"</button></td></tr>").join("");
  return "<section class=\"panel boq-panel\"><div class=\"panel-head\"><div><span class=\"eyebrow\">COST ESTIMATION</span><h2>"+t("boq")+"</h2></div></div>"+
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
render();
