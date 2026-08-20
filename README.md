# Realty Nest — warstwa prezentacji

Aplikacja Next.js systemu CRM/CMS dla biur pośrednictwa nieruchomości: publiczna witryna z ofertami,
panel operacyjny agencji oraz warstwa brzegowa pośrednicząca w dostępie do API GraphQL. Zawiera
dziesięć funkcji opartych na modelu językowym oraz mechanizmy ochronne warstwy aplikacyjnej.

Aplikacja powstała jako część pracy magisterskiej w Instytucie Bezpieczeństwa i Informatyki
Uniwersytetu Komisji Edukacji Narodowej w Krakowie. Warstwa danych znajduje się w osobnym
repozytorium: **realty-nest-crm-api** i musi być uruchomiona jako pierwsza.

## Wymagania

| Składnik | Wersja | Uwagi |
|---|---|---|
| Node.js | 22.18 lub nowszy | Wersja minimalna wynika z natywnej obsługi plików `.ts` przez pakiet testów bezpieczeństwa |
| npm | 10 lub nowszy | |
| Warstwa danych | — | Musi działać, domyślnie na porcie 4000 |
| Playwright | opcjonalnie | Tylko dla testów przeglądarkowych: `npx playwright install chromium` |
| k6 | opcjonalnie | Tylko dla pomiarów wydajnościowych; narzędzie zewnętrzne, nie pakiet npm |

## Uruchomienie

```bash
npm install
cp .env.example .env.local
npm run build
npm start
```

Aplikacja dostępna jest pod adresem `http://localhost:3000`. Do pracy nad kodem służy `npm run dev`.

### Konfiguracja

Dwie zmienne są obowiązkowe — bez nich aplikacja przerywa start w `src/instrumentation.ts`,
zanim obsłuży pierwsze żądanie:

| Zmienna | Znaczenie |
|---|---|
| `AUTH_SECRET` | Klucz sesji, **co najmniej 32 znaki**; generuje `openssl rand -base64 48` |
| `GRAPHQL_INTERNAL_URL` | Adres warstwy danych, domyślnie `http://localhost:4000/graphql` |

Pozostałe zmienne są opcjonalne i dotyczą usług zewnętrznych. System działa bez nich, wyłączając
powiązane funkcje w sposób kontrolowany:

| Usługa | Funkcje zależne | Zachowanie bez klucza |
|---|---|---|
| Cloudinary | Wysyłka zdjęć i dokumentów, podgląd dokumentów, kopie zapasowe | Trasy zwracają 503, reszta systemu działa |
| Google Gemini | Dziesięć funkcji sztucznej inteligencji | Panele zwracają 503 z komunikatem o niedostępności |
| Resend | Kod jednorazowy, formularz kontaktowy | Kod zapisywany w konsoli serwera zamiast wysyłki |

Zdjęcia ofert, awatary, kafelki map i geokodowanie pochodzą z usług nieobjętych uwierzytelnianiem,
ale **wymagają dostępu do sieci**. Bez połączenia interfejs wygląda na pozbawiony treści.

## Testy

```bash
npm run test:security   # 27 asercji mechanizmów warstwy brzegowej
npm run test:smoke      # dostępność 18 podstron panelu
npm run test:blackbox   # scenariusze funkcjonalne w przeglądarce
npm run bench:security  # mikropomiary kosztu mechanizmów ochronnych
```

Testy wymagają wypełnionej bazy danych i działających obu warstw systemu. Konta demonstracyjne
opisano w README warstwy danych; hasło to `DemoPass123!`.

`bench:security` mierzy również funkcje warstwy danych, więc potrzebuje dostępu do jej repozytorium.
Domyślnie szuka go obok tego katalogu; inne położenie wskazuje zmienna `REALTY_NEST_DB_PATH`.

Narzędzia pomocnicze: `scripts/audit-contrast.mjs` mierzy kontrast tekstu wobec WCAG,
`scripts/audit-i18n.mjs` wykrywa polskie napisy pozostałe w wersji angielskiej. Audyt dwujęzyczności
odwiedza podstrony dwukrotnie i wyzwala zabezpieczenie przed masowym pobieraniem danych —
pakiet `test:smoke` należy uruchamiać przed nim albo po kilkuminutowej przerwie.

## Struktura

```
src/
  app/[locale]/   trasy publiczne i panel operacyjny, dwujęzyczne
  app/api/        warstwa brzegowa: proxy GraphQL, wysyłka plików, funkcje AI, uwierzytelnianie
  components/     interfejs; components/dashboard to panel operacyjny
  lib/            zapytania GraphQL, uprawnienia, mechanizmy ochronne, integracje
  i18n/           słowniki polski i angielski
  styles/         tokeny motywu jasnego i ciemnego oraz mostek do biblioteki komponentów
```

## Uwaga o kluczach

Klucze użyte w środowisku deweloperskim nie znajdują się w repozytorium. Pliki `.env*` są
ignorowane; śledzony jest wyłącznie szablon `.env.example`.

## Licencja

MIT — zob. `LICENSE`.
