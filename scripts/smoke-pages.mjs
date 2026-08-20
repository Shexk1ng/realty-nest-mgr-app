// Walks every dashboard page in a real browser and reports console/network errors.
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "admin@nestrealty.pl";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "DemoPass123!";

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

// Noise that says nothing about page health.
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /_next\/image/i,
  /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/i,
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const problems = [];
let current = "(logowanie)";

page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (IGNORE.some((r) => r.test(t))) return;
  problems.push({ page: current, kind: "console", detail: t.slice(0, 180) });
});
page.on("pageerror", (e) => {
  problems.push({ page: current, kind: "wyjątek", detail: String(e).slice(0, 180) });
});
page.on("response", (r) => {
  if (r.status() < 400) return;
  const u = r.url();
  if (IGNORE.some((re) => re.test(u))) return;
  problems.push({ page: current, kind: `HTTP ${r.status()}`, detail: u.replace(APP, "").slice(0, 140) });
});

console.log("Logowanie…");
await page.goto(`${APP}/login`, { waitUntil: "networkidle", timeout: 90_000 });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 30_000 });
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 60_000 });
console.log("Zalogowano.\n");

for (const path of PAGES) {
  current = path;
  const before = problems.length;
  try {
    await page.goto(`${APP}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1200);
  } catch (e) {
    problems.push({ page: path, kind: "nawigacja", detail: String(e).slice(0, 140) });
  }
  const added = problems.length - before;
  console.log(`${added === 0 ? "  OK   " : "  ZGŁ. "} ${path}${added ? `  (${added})` : ""}`);
}

await ctx.close();
await browser.close();

console.log(`\n──────── PODSUMOWANIE ────────`);
if (problems.length === 0) {
  console.log("Brak błędów na żadnej podstronie.");
} else {
  const byPage = new Map();
  for (const p of problems) {
    if (!byPage.has(p.page)) byPage.set(p.page, []);
    byPage.get(p.page).push(p);
  }
  for (const [pg, list] of byPage) {
    console.log(`\n${pg}`);
    for (const p of list) console.log(`   [${p.kind}] ${p.detail}`);
  }
  console.log(`\nRazem zgłoszeń: ${problems.length}`);
}
process.exit(problems.length ? 1 : 0);
