// Browser smoke test: drives the built app like a user. Run: npm run build && node e2e/smoke.cjs
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const PORT = 4173, URL = `http://localhost:${PORT}/`;
const results = []; const alerts = []; const errors = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); };

(async () => {
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e)));
  // Google Fonts is an external stylesheet; sandboxes without internet block it, which is not an app defect.
  page.on("console", m => { if (m.type() === "error" && !m.text().includes("ERR_TUNNEL_CONNECTION_FAILED") && !m.text().includes("ERR_NAME_NOT_RESOLVED")) errors.push(m.text()); });
  page.on("dialog", async d => { alerts.push(d.message()); if (d.type() === "prompt") await d.accept("EGP"); else await d.accept(); });
  const text = async sel => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ");
  try {
    await page.goto(URL); await page.waitForSelector("#new-project-toggle");
    await page.click("#new-project-toggle");
    await page.fill("#project-form [name=name]", "E2E Apartment"); await page.selectOption("#project-form [name=buildingCondition]", "plaster-only"); await page.click("#project-form button[type=submit]");
    await page.waitForSelector("#room-form");
    check("project created", (await text("h1")).includes("E2E Apartment"));

    await page.fill("#room-form [name=name]", "Living"); await page.fill("#room-form [name=length]", "5");
    await page.fill("#room-form [name=width]", "4"); await page.fill("#room-form [name=height]", "3");
    await page.click("#room-form button[type=submit]");
    await page.waitForSelector(".room-editor .face-form");
    for (const [l] of [[5], [4], [5], [4]]) {
      await page.fill(".face-form [name=length]", String(l)); await page.fill(".face-form [name=height]", "3");
      await page.click(".face-form button[type=submit]");
    }
    check("four wall faces added", (await page.locator(".face-card").count()) === 4);
    await page.locator(".opening-form").first().locator("[name=width]").fill("1.2");
    await page.locator(".opening-form").first().locator("[name=height]").fill("1.5");
    await page.locator(".opening-form").first().locator("button[type=submit]").click();
    check("opening added", (await page.locator(".opening-row").count()) === 1);

    await page.click("#add-room-takeoff");
    await page.waitForSelector("#boq-items tbody tr");
    const boq = await text("#boq-items");
    check("takeoff: floor 20.00 and ceiling 20.00 lines", (boq.match(/20\.00/g) || []).length >= 2, boq.slice(0, 300));
    check("takeoff: net wall area 52.20 (54 gross - 1.8 opening)", /52\.20/.test(boq), boq.slice(0, 300));

    // priced manual line
    await page.fill("#boq-form [name=code]", "TILE"); await page.fill("#boq-form [name=description]", "Floor tile");
    await page.fill("#boq-form [name=netQuantity]", "10"); await page.fill("#boq-form [name=sourceRef]", "Spec 09");
    await page.fill("#boq-form [name=unitRate]", "100"); await page.fill("#boq-form [name=rateSourceRef]", "Quote 1");
    await page.click("#boq-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#boq-items")?.textContent?.includes("TILE"));
    check("priced BOQ line added", true);

    // currency + adjustment
    await page.fill("#project-currency", "EGP"); await page.locator("#project-currency").blur();
    await page.fill("#adjustment-form [name=label]", "Profit"); await page.selectOption("#adjustment-form [name=kind]", "profit");
    await page.fill("#adjustment-form [name=ratePct]", "10"); await page.fill("#adjustment-form [name=approvalRef]", "Mgr OK");
    await page.click("#adjustment-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#cost-panel")?.textContent?.includes("Mgr OK"));
    const cost = await text("#cost-panel");
    check("adjustment applied: direct 1000 → grand 1100", /1000\.00/.test(cost) && /1100\.00/.test(cost), cost.slice(0, 300));
    await page.fill("#adjustment-form [name=label]", "Bad"); await page.fill("#adjustment-form [name=ratePct]", "5");
    await page.fill("#adjustment-form [name=approvalRef]", "x"); await page.fill("#adjustment-form [name=fixedAmount]", "9");
    await page.click("#adjustment-form button[type=submit]");
    await page.waitForTimeout(200);
    check("rate+fixed adjustment rejected with message", alerts.length > 0, JSON.stringify(alerts));

    // variation order
    await page.fill("#variation-form [name=title]", "Extra"); await page.fill("#variation-form [name=reason]", "Client");
    await page.fill("#variation-form [name=baseRevision]", "R1"); await page.click("#variation-form button[type=submit]");
    await page.waitForSelector(".vo-item-form");
    const f = page.locator(".vo-item-form");
    await f.locator("[name=code]").fill("X1"); await f.locator("[name=description]").fill("Extra tile");
    await f.locator("[name=netQuantity]").fill("2"); await f.locator("[name=sourceRef]").fill("Site");
    await f.locator("[name=unitRate]").fill("50"); await f.locator("[name=rateSourceRef]").fill("Q2");
    await f.locator("button[type=submit]").click();
    await page.waitForSelector("[data-vo-action=submitted]");
    await page.click("[data-vo-action=submitted]");
    await page.waitForSelector("[data-vo-action=approved]");
    await page.click("[data-vo-action=approved]");
    await page.waitForFunction(() => document.querySelector("#variation-panel")?.textContent?.includes("1200.00") || document.querySelector("#variation-panel")?.textContent?.includes("1200"));
    check("approved variation moves revised total to 1200", true);
    check("approved variation cannot be deleted or edited", (await page.locator("[data-vo-delete]").count()) === 0 && (await page.locator(".vo-item-form").count()) === 0);

    // schedule: rate + manual
    await page.fill("#rate-form [name=value]", "25"); await page.fill("#rate-form [name=sourceRef]", "Site record");
    await page.fill("#rate-form [name=sourceDate]", "2026-10-01"); await page.fill("#rate-form [name=location]", "Cairo");
    await page.click("#rate-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#schedule-panel")?.textContent?.includes("Site record"));
    await page.fill("#manual-activity-form [name=name]", "Prep"); await page.fill("#manual-activity-form [name=durationDays]", "3");
    await page.fill("#manual-activity-form [name=durationSourceRef]", "Programme"); await page.click("#manual-activity-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#schedule-panel")?.textContent?.includes("Programme"));
    const sch = await text("#schedule-panel");
    check("schedule computes duration for sourced activity", /3/.test(sch) && !/incomplete|غير مكتمل/.test(sch.split("Prep")[1] ?? ""));

    // assemblies
    await page.fill("#assembly-form [name=name]", "Floor system"); await page.click("#assembly-form button[type=submit]");
    await page.waitForSelector(".asm-component-form");
    const af = page.locator(".asm-component-form");
    await af.locator("[name=code]").fill("ASM-TILE"); await af.locator("[name=description]").fill("Tile layer");
    await af.locator("[name=quantityPerBasisUnit]").fill("1"); await af.locator("[name=ruleRef]").fill("Spec 09-30");
    await af.locator("button[type=submit]").click();
    await page.waitForSelector("[data-asm-apply]:not([disabled])");
    const beforeAlerts = alerts.length;
    await page.click("[data-asm-apply]"); await page.waitForTimeout(300);
    check("assembly applied to rooms (1 line added)", alerts.length === beforeAlerts + 1 && /1/.test(alerts[alerts.length - 1]), alerts[alerts.length - 1]);
    check("assembly line is in the BOQ", (await text("#boq-items")).includes("ASM-TILE"));
    await page.click("[data-asm-apply]"); await page.waitForTimeout(300);
    check("re-applying adds nothing (no duplicates)", (await page.locator("#boq-items tbody tr", { hasText: "ASM-TILE" }).count()) === 1, alerts[alerts.length - 1]);
    const noRule = page.locator(".asm-component-form");
    await noRule.locator("[name=code]").fill("X2"); await noRule.locator("[name=description]").fill("No rule");
    await noRule.locator("[name=quantityPerBasisUnit]").fill("1"); await noRule.locator("[name=ruleRef]").fill(" ");
    const n1 = alerts.length; await noRule.locator("button[type=submit]").click(); await page.waitForTimeout(200);
    check("assembly component without a rule reference is rejected", alerts.length === n1 + 1 || (await page.locator("[data-asm-remove-component]").count()) === 1);

    // MEP
    await page.selectOption("#mep-point-form [name=discipline]", "electrical");
    await page.fill("#mep-point-form [name=deviceType]", "Socket"); await page.fill("#mep-point-form [name=count]", "4");
    await page.fill("#mep-point-form [name=drawingRef]", "E-01"); await page.check("#mep-point-form [name=reviewed]");
    await page.click("#mep-point-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#mep-panel")?.textContent?.includes("Socket"));
    await page.check("#mep-circuit-form [name=pointIds]");
    await page.fill("#mep-circuit-form [name=panelRef]", "DB1"); await page.fill("#mep-circuit-form [name=circuitRef]", "C1");
    await page.fill("#mep-circuit-form [name=scheduleRef]", "Schedule 1"); await page.click("#mep-circuit-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#mep-panel")?.textContent?.includes("Schedule 1"));
    await page.fill("#mep-cable-form [name=spec]", "3x2.5"); await page.fill("#mep-cable-form [name=cores]", "3");
    await page.fill("#mep-cable-form [name=routeRef]", "R-1"); await page.fill("#mep-cable-form [name=segments]", "10, 5");
    await page.click("#mep-cable-form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#mep-panel")?.textContent?.includes("R-1"));
    const mepText = await text("#mep-panel");
    check("MEP circuit count comes from the schedule (1)", /1 \(/.test(mepText) || /\b1\b/.test(mepText.split("عدد الدوائر")[1] ?? ""), mepText.slice(0, 200));
    check("cable conductor length 45 = 15 m x 3 cores", /\b45\b/.test(mepText));
    await page.click("[data-mep-sync]"); await page.waitForTimeout(300);
    check("verified MEP point reaches the BOQ", /mep:/.test(await text("#boq-items")));
    await page.uncheck("[data-mep-review]"); await page.waitForTimeout(200);
    const n2 = alerts.length; await page.click("[data-mep-sync]"); await page.waitForTimeout(300);
    check("un-verified point warns that its BOQ line is stale", alerts.length === n2 + 1 && alerts[alerts.length - 1].split("\n").length >= 2, alerts[alerts.length - 1]);

    // sync conflict review
    await page.fill("#conflict-form [name=base]", '{"quantity":10,"note":"a"}');
    await page.fill("#conflict-form [name=local]", '{"quantity":12,"note":"a"}');
    await page.fill("#conflict-form [name=remote]", '{"quantity":15,"note":"b"}');
    await page.click("#conflict-form button[type=submit]");
    await page.waitForSelector("#conflict-choices-form");
    check("protected field conflict is surfaced, not auto-resolved", /Conflicts: 1/.test(await text("#conflict-review-panel")));
    const n3 = alerts.length; await page.click("[data-conflict-resolve]"); await page.waitForTimeout(200);
    check("resolving without an explicit choice is refused", alerts.length === n3 + 1 && /quantity/.test(alerts[alerts.length - 1]), alerts[alerts.length - 1]);
    await page.selectOption("[name='choice:quantity']", "remote"); await page.click("[data-conflict-resolve]");
    await page.waitForSelector(".conflict-output");
    const merged = await text(".conflict-output");
    check("merged record takes the chosen quantity and the non-conflicting remote note", /"quantity": 15/.test(merged) && /"note": "b"/.test(merged), merged);

    // persistence across reload
    await page.waitForTimeout(500); await page.reload(); await page.waitForSelector("#room-form");
    check("project survives reload", (await text("h1")).includes("E2E Apartment") && (await text("#cost-panel")).includes("Mgr OK"));
    check("variation and schedule survive reload", (await text("#variation-panel")).includes("VO-1") && (await text("#schedule-panel")).includes("Programme"));

    // language toggle
    check("Arabic UI is the default", /[\u0600-\u06FF]/.test(await text("#cost-panel")));
    await page.click("#language-toggle"); await page.waitForTimeout(200);
    check("English UI after toggle", /Grand total/.test(await text("#cost-panel")));
    await page.click("#language-toggle");

    // mobile layout (390x844)
    const shotDir = process.env.SHOT_DIR ?? "e2e-artifacts"; require("node:fs").mkdirSync(shotDir, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => {
      const w = window.innerWidth, bad = [];
      for (const el of document.querySelectorAll("main *, .shell *")) {
        if (el.closest(".boq-table-wrap")) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > w + 1 || r.left < -1)) bad.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ")[0]}`);
      }
      return { page: document.documentElement.scrollWidth - w, bad: [...new Set(bad)].slice(0, 8) };
    });
    check("mobile: no horizontal page overflow", overflow.page <= 1, JSON.stringify(overflow));
    check("mobile: no element sticks out of the screen", overflow.bad.length === 0, JSON.stringify(overflow));
    for (const id of ["#room-form", "#boq-form", "#assembly-panel", "#mep-panel", "#schedule-panel", "#cost-panel", "#variation-panel", "#conflict-review-panel"]) {
      await page.locator(id).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(80);
      await page.screenshot({ path: `${shotDir}/mobile-${id.replace("#", "")}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    // exports
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#export-xlsx")]);
    check("xlsx download starts", dl.suggestedFilename().endsWith(".xlsx"));
    await page.screenshot({ path: process.env.SHOT ?? "e2e-last.png", fullPage: true });
  } catch (e) { check("flow completed without exception", false, String(e).split("\n")[0]); await page.screenshot({ path: "e2e-failure.png", fullPage: true }).catch(() => {}); }
  check("no console/page errors", errors.length === 0, errors.join(" | ").slice(0, 400));
  await browser.close(); server.kill();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})();
