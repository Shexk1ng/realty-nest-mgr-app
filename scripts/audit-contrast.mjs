// Walks every dashboard page in both themes and reports text that fails the WCAG AA
// contrast ratio against its own rendered background.
//
// Colour resolution is delegated to the browser via a 1×1 canvas: the design system
// emits oklch/oklab and color-mix, which no hand-written parser handles correctly —
// painting the value and reading the pixel back gives the true sRGB triple.
//
// Uruchomienie:
//   node scripts/audit-contrast.mjs            # oba motywy, wszystkie podstrony
//   AUDIT_ROLE=agent1@nestrealty.pl node scripts/audit-contrast.mjs
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.AUDIT_ROLE ?? "admin@nestrealty.pl";
const PASSWORD = process.env.AUDIT_PASSWORD ?? "DemoPass123!";

const PAGES = [
  "/dashboard",
  "/dashboard/properties",
  "/dashboard/properties/new",
  "/dashboard/contacts",
  "/dashboard/enquiries",
  "/dashboard/pipeline",
  "/dashboard/calendar",
  "/dashboard/viewings",
  "/dashboard/tasks",
  "/dashboard/transactions",
  "/dashboard/commission",
  "/dashboard/documents",
  "/dashboard/marketing",
  "/dashboard/propshare",
  "/dashboard/stats",
  "/dashboard/security",
  "/dashboard/settings",
  "/company",
];

// Runs inside the page. Returns every leaf text node below the AA threshold.
function collectLowContrast() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const cache = new Map();

  const toRGBA = (css) => {
    if (cache.has(css)) return cache.get(css);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const v = [d[0], d[1], d[2], d[3] / 255];
    cache.set(css, v);
    return v;
  };
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));

  // Walk ancestors until the accumulated background is opaque; fall back to white.
  // A gradient or photo anywhere in the chain means the real backdrop is not a flat
  // colour, so the computed ratio would be fiction — those are reported separately.
  const bgOf = (el) => {
    let n = el, acc = null, painted = false;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") painted = true;
      if (n.querySelector?.("img, svg image, video")) painted = true;
      const c = toRGBA(cs.backgroundColor);
      if (c[3] > 0) acc = acc ? over(acc.concat(1), c.slice(0, 3)).concat(1) : c;
      if (acc && acc[3] >= 0.99) return { rgb: acc.slice(0, 3), painted };
      n = n.parentElement;
    }
    return { rgb: acc ? over(acc, [255, 255, 255]) : [255, 255, 255], painted };
  };

  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length) continue;
    const txt = (el.textContent || "").trim();
    if (txt.length < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;

    const { rgb: bg, painted } = bgOf(el);
    const fg = over(toRGBA(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio >= need) continue;

    out.push({
      txt: txt.slice(0, 40),
      ratio: +ratio.toFixed(2),
      need,
      painted,
      cls: (el.className || "").toString().slice(0, 55),
    });
  }
  return out.sort((a, b) => a.ratio - b.ratio);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${APP}/login`, { waitUntil: "networkidle", timeout: 90_000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 30_000 });
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 60_000 });
console.log(`Zalogowano jako ${EMAIL}.\n`);

const findings = [];

for (const theme of ["light", "dark"]) {
  console.log(`──── motyw: ${theme} ────`);
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);

  for (const path of PAGES) {
    try {
      await page.goto(`${APP}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(900);
    } catch {
      console.log(`  POMIN. ${path} (nawigacja)`);
      continue;
    }
    const applied = await page.evaluate(() =>
      document.documentElement.className.match(/\b(light|dark)\b/)?.[0] ?? "?");
    if (applied !== theme) {
      console.log(`  UWAGA  ${path} — motyw ${applied}, oczekiwano ${theme}`);
    }
    const rows = await page.evaluate(collectLowContrast);
    // Same class + same ratio on many rows of a table is one defect, not fifty.
    const seen = new Map();
    for (const r of rows) {
      const key = `${r.cls}|${r.ratio}`;
      if (seen.has(key)) { seen.get(key).count++; continue; }
      seen.set(key, { ...r, count: 1 });
    }
    const unique = [...seen.values()];
    for (const u of unique) findings.push({ theme, path, ...u });
    console.log(`  ${unique.length === 0 ? "OK   " : "ZGŁ. "} ${path}${unique.length ? `  (${unique.length})` : ""}`);
  }
  console.log("");
}

await ctx.close();
await browser.close();

console.log("──────── PODSUMOWANIE ────────");
if (findings.length === 0) {
  console.log("Brak elementów poniżej progu AA.");
  process.exit(0);
}

// Text sitting on a gradient or photo cannot be scored against a flat colour — listed
// apart so it is judged by eye instead of being "fixed" against a fictional ratio.
const overArt = findings.filter((f) => f.painted);
const flat = findings.filter((f) => !f.painted);

// Group by the offending class so one fix maps to one entry.
const byClass = new Map();
for (const f of flat) {
  const key = f.cls || "(bez klasy)";
  if (!byClass.has(key)) byClass.set(key, []);
  byClass.get(key).push(f);
}
const sorted = [...byClass.entries()].sort(
  (a, b) => Math.min(...a[1].map((x) => x.ratio)) - Math.min(...b[1].map((x) => x.ratio)));

for (const [cls, list] of sorted) {
  const worst = Math.min(...list.map((x) => x.ratio));
  const themes = [...new Set(list.map((x) => x.theme))].join(", ");
  const pages = [...new Set(list.map((x) => x.path))];
  console.log(`\n${cls}`);
  console.log(`   najgorszy ${worst} (próg ${list[0].need}) · motyw: ${themes} · podstron: ${pages.length}`);
  console.log(`   przykład: "${list[0].txt}"`);
  console.log(`   ${pages.slice(0, 6).join(", ")}${pages.length > 6 ? ` …+${pages.length - 6}` : ""}`);
}
console.log(`\nRóżnych klas do naprawy: ${byClass.size}`);

if (overArt.length) {
  const cls = [...new Set(overArt.map((f) => f.cls || "(bez klasy)"))];
  console.log(`\n──── pominięto: tekst na gradiencie lub zdjęciu (${overArt.length}) ────`);
  console.log("Współczynnika nie da się tu policzyć wobec płaskiego koloru — do oceny wzrokowej:");
  for (const c of cls.slice(0, 12)) console.log(`   ${c}`);
}
