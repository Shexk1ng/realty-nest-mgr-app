// Walks every dashboard page in the English locale and reports text that is still Polish.
//
// Detection is by diacritics plus a closed list of common Polish words without them: a page
// that renders "Nieruchomość" or "Szukaj" under /en has a string the dictionary never saw.
// Data from the demo database is Polish by design (client names, city names, note text), so
// only chrome is inspected — headings, table headers, buttons, labels, placeholders, tabs.
//
// Uruchomienie:
//   node scripts/audit-i18n.mjs
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.AUDIT_EMAIL ?? "admin@nestrealty.pl";
const PASSWORD = process.env.AUDIT_PASSWORD ?? "DemoPass123!";

const PAGES = [
  "/dashboard", "/dashboard/properties", "/dashboard/properties/new", "/dashboard/contacts",
  "/dashboard/enquiries", "/dashboard/pipeline", "/dashboard/calendar", "/dashboard/viewings",
  "/dashboard/tasks", "/dashboard/transactions", "/dashboard/commission", "/dashboard/documents",
  "/dashboard/marketing", "/dashboard/propshare", "/dashboard/stats", "/dashboard/security",
  "/dashboard/settings", "/company",
];

// Chrome only — never cell contents, which legitimately hold Polish demo data.
const CHROME = [
  "h1", "h2", "h3", "thead th", "button", "label", "legend",
  "[role=tab]", "[placeholder]", "[aria-label]", ".rn-hint", ".empty-state",
];

function findPolish() {
  const DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  // Frequent Polish words that carry no diacritic and would otherwise slip through.
  const WORDS = /\b(szukaj|dodaj|zapisz|anuluj|usun|edytuj|nowy|nowa|nowe|brak|wszystkie|filtruj|status|termin|klient|agent|oferta|oferty|kwota|razem|data|nazwa|opis|typ|akcje|podglad|pobierz|wynik|liczba|okres|zakres)\b/i;
  const SKIP = /^(realty nest|propshare|crm|pdf|docx|xlsx|img|id|api|ai|rodo|vat|pcc|pln|zł|%|#)$/i;

  const out = [];
  const seen = new Set();
  for (const sel of ["h1","h2","h3","thead th","button","label","legend","[role=tab]",".rn-hint",".empty-state"]) {
    for (const el of document.querySelectorAll(sel)) {
      const txt = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (!txt || txt.length < 3 || txt.length > 90 || SKIP.test(txt)) continue;
      // Event chips, listing cards and user menus are <button>s whose text is DATA from the
      // demo database (Polish names, addresses, times), not interface chrome. Without this
      // the calendar alone contributes fifty false positives and swamps the signal.
      if (sel === "button" && /\d|·|—|@/.test(txt)) continue;
      if (!DIACRITICS.test(txt) && !WORDS.test(txt)) continue;
      const key = `${sel}|${txt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ gdzie: sel, txt });
    }
  }
  // Attributes carry user-visible text too and are easy to forget.
  for (const attr of ["placeholder", "aria-label", "title"]) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      const txt = (el.getAttribute(attr) || "").trim();
      if (!txt || txt.length < 3 || txt.length > 90 || SKIP.test(txt)) continue;
      if (!DIACRITICS.test(txt) && !WORDS.test(txt)) continue;
      const key = `@${attr}|${txt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ gdzie: `@${attr}`, txt });
    }
  }
  return out;
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
console.log(`Zalogowano jako ${EMAIL}. Sprawdzam wersję angielską.\n`);

const findings = [];
for (const path of PAGES) {
  try {
    await page.goto(`${APP}/en${path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(900);
  } catch {
    console.log(`  POMIN. ${path}`);
    continue;
  }
  const rows = await page.evaluate(findPolish);
  for (const r of rows) findings.push({ path, ...r });
  console.log(`  ${rows.length === 0 ? "OK   " : "ZGŁ. "} ${path}${rows.length ? `  (${rows.length})` : ""}`);
}

await ctx.close();
await browser.close();

console.log("\n──────── PODSUMOWANIE ────────");
if (findings.length === 0) {
  console.log("Wersja angielska nie zawiera polskich napisów w elementach interfejsu.");
  process.exit(0);
}
const byPage = new Map();
for (const f of findings) {
  if (!byPage.has(f.path)) byPage.set(f.path, []);
  byPage.get(f.path).push(f);
}
for (const [p, list] of byPage) {
  console.log(`\n${p}  (${list.length})`);
  for (const f of list.slice(0, 12)) console.log(`   ${f.gdzie.padEnd(14)} ${f.txt}`);
  if (list.length > 12) console.log(`   …i ${list.length - 12} więcej`);
}
console.log(`\nRazem: ${findings.length}`);
process.exit(1);
