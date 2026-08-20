# Realty Nest — procedury testowe (Windows, CMD)

Dokument opisuje **każdy** proces testowy, którego wyniki cytuje rozdział czwarty pracy: co weryfikuje, jak go uruchomić i jakiego wyniku oczekiwać. Komendy podano w składni **wiersza poleceń Windows (`cmd.exe`)** i można je wykonać w podanej kolejności od zera.

**Środowisko odniesienia:** Windows 11, Node.js v26.1.0 (win32 x64), Intel Core i7-7700K, 16 GB RAM — ta sama konfiguracja, na której wykonano pomiary opisane w pracy.

**Łączny czas:** ok. 30–40 minut, z czego ~7 minut na testy wydajnościowe.

---

## 0. Przygotowanie

### 0.1 Ścieżki

Ustaw dwie zmienne na początku **każdej** sesji `cmd.exe`. Podstaw własne ścieżki, jeśli repozytoria leżą gdzie indziej:

```bat
set APP=C:\Users\shex1\Documents\GitHub\realty-nest
set DB=C:\Users\shex1\Documents\GitHub\realty-nest-db
```

> **Oba repozytoria muszą leżeć obok siebie, w tym samym katalogu nadrzędnym.** Skrypt `bench-security.mjs` odwołuje się twardą ścieżką do `../../realty-nest-db/node_modules/bcryptjs`. Jeśli katalogi będą rozdzielone, mikro-pomiary kosztu nie ruszą.

### 0.2 Wymagania wstępne

```bat
node --version
mongod --version
k6 version
```

**Node.js ≥ 22.18.** Skrypty `test:security` (oba repozytoria), `bench:security` i `test:blackbox` importują pliki `.ts` bezpośrednio, co wymaga natywnego usuwania typów. Na starszej wersji zobaczysz mylący komunikat `Unknown file extension ".ts"`.

**MongoDB** musi działać lokalnie albo mieć adres podany w `MONGO_URI`. Uruchomienie z własnym katalogiem danych: `mongod --dbpath <ścieżka>`.

**k6 nie jest pakietem npm** — `npm install` go nie dostarczy:

```bat
winget install k6 --source winget
```

### 0.3 Cztery pułapki, które zablokują uruchomienie

1. **Brak `.env.example` w `realty-nest`.** README każe go skopiować, ale w repozytorium go nie ma (`.gitignore` zawiera `.env*`). Plik `.env.local` trzeba złożyć ręcznie — krok 1.2. Bez `AUTH_SECRET` i `GRAPHQL_INTERNAL_URL` aplikacja **odmówi startu**: `src/instrumentation.ts` rzuca wyjątkiem przed obsłużeniem pierwszego żądania. `AUTH_SECRET` krótszy niż 32 znaki daje ten sam skutek.
2. **`realty-nest-db` wymaga `.env` również dla testów „bez serwera".** Funkcja szyfrująca sekrety TOTP rzuca wyjątkiem bez `TOTP_ENCRYPT_KEY`, a klucz musi mieć **dokładnie 64 znaki szesnastkowe** — walidacja jest ścisła.
3. **Katalog `data\` w `realty-nest` nie istnieje po sklonowaniu** (jest w `.gitignore`), ale nie trzeba go tworzyć ręcznie — `src/lib/auth/email-2fa-store.ts` zakłada go sam przy pierwszym zapisie preferencji drugiego składnika.
4. **Kolejność testów ma znaczenie** — patrz 0.4.

### 0.4 Kolejność — to nie jest dowolne

- **`test:blackbox` uruchamiaj jako ostatni z testów funkcjonalnych.** Pakiet celowo wyczerpuje limiter logowania (SEC-03 i TC-AUTH-06 wykonują jedenastą próbę). Liczniki żyją w pamięci procesu, więc **po tym przebiegu logowanie jest zablokowane aż do restartu backendu**.
- **Przed `perf:login` i przed `perf:endpoints` zrestartuj backend.** Oba pomiary wykonują serie logowań; bez restartu trafią w wyczerpany limiter i zmierzą czas odmowy zamiast czasu obsługi.
- **Nie mieszaj ręcznych zapytań masowych z~przebiegami.** Moduł zapobiegania utracie danych zlicza **unikalne** rekordy w oknie pięciu minut, osobno dla pary (adres IP, typ danych). Zwykłe korzystanie z interfejsu go nie wyzwala, bo tabele pobierają po 20 rekordów na stronę. Jeśli jednak w trakcie testów wyślesz ręcznie zapytania o pełne listy (np. `getContacts(limit:200)`), zapełnisz okno i kolejne żądania dostaną `HTTP 403` z kodem `DLP_BLOCKED` — to poprawne zadziałanie zabezpieczenia, nie awaria. Okno opróżnia się po pięciu minutach; restart procesu aplikacji czyści je natychmiast.

---

## 1. Instalacja i konfiguracja

### 1.1 Zależności

```bat
cd /d %DB%
npm install

cd /d %APP%
npm install
npx playwright install chromium
```

### 1.2 Zmienne środowiskowe

`%DB%\.env` — utwórz plik o treści:

```
MONGO_URI=mongodb://127.0.0.1:27017/realty-nest
JWT_SECRET=zmien-to-na-dlugi-losowy-ciag-min-32-znaki
TOTP_ENCRYPT_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NODE_ENV=development

SEED_ADMIN_EMAIL=bartlomiejdejewski01@gmail.com
SEED_ADMIN_PASSWORD=DemoPass123!
SEED_ADMIN_FIRST_NAME=Bartlomiej
SEED_ADMIN_LAST_NAME=Dejewski
COMPANYADMIN_EMAIL=admin@nestrealty.pl
DEMO_PASSWORD=DemoPass123!
```

Własny `TOTP_ENCRYPT_KEY` (dokładnie 64 znaki hex) wygenerujesz poleceniem:

```bat
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **`SEED_ADMIN_EMAIL`, `COMPANYADMIN_EMAIL` i `DEMO_PASSWORD` muszą zgadzać się z danymi utworzonymi przez seed.** Jeśli się rozjadą, `test:authz` **pominie** testy zamiast je oblać — patrz krok 4.

`%APP%\.env.local` — utwórz plik o treści:

```
AUTH_SECRET=zmien-to-na-dlugi-losowy-ciag-min-32-znaki
GRAPHQL_INTERNAL_URL=http://localhost:4000/graphql
APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_EMAIL=kontakt@nestrealty.pl

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_EMBED_MODEL=gemini-embedding-2
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
```

Następnie katalog na preferencje drugiego składnika:

```bat
cd /d %APP%
if not exist data mkdir data
echo {}> data\email-2fa-prefs.json
```

**Co się stanie bez kluczy opcjonalnych.** Bez `GEMINI_API_KEY` punkt końcowy asystenta zwróci 503, więc pomiar `t_asystent_rag` nie da wyniku (tabela 4.7, wiersz asystenta); pozostałe testy przejdą. Bez `CLOUDINARY_*` nie zadziała wysyłka plików. Scenariusz SEC-06 sprawdza teraz działającą trasę dostarczania, a nie strukturę adresu, więc bez poświadczeń ogranicza się do części niezależnej od usługi (odmowa 401 bez sesji, brak nagłówka `Location`); pełną ścieżkę weryfikuje dopiero wtedy, gdy w bazie jest dokument z rzeczywistym plikiem. Bez `RESEND_API_KEY` kody e-mail trafią do konsoli zamiast na pocztę, co dla testów wystarcza.

---

## 2. Kontrola statyczna

```bat
cd /d %APP%
npm run typecheck
npm run lint

cd /d %DB%
npm run compile
```

Wszystkie trzy muszą zakończyć się bez błędów i bez ostrzeżeń.

> **Aplikacja uruchamiana jest z builda produkcyjnego.** Jeśli zmieniałeś cokolwiek w `realty-nest/src`, przed testami wykonaj `npm run build`, inaczej działający proces nadal serwuje poprzednią wersję.

---

## 3. Baza i dane demonstracyjne

Upewnij się, że MongoDB działa, a następnie:

```bat
cd /d %DB%
npm run seed:demo
```

Na bazie, w której są już jakieś konta, użyj `npm run seed:demo -- --reset` — skrypt wyczyści kolekcje i wypełni je od nowa.

> **Nie uruchamiaj `seed:admin` przed `seed:demo`.** `seed:demo` wymaga pustej bazy i po zastaniu choćby jednego konta przerywa działanie komunikatem `Database already has 1 user(s)`. `seed:admin` to wariant alternatywny — zakłada samo konto administratora systemu z kilkoma rekordami przykładowymi i służy do uruchomienia czystej instancji, nie do przygotowania danych testowych.

Powstanie zbiór opisany w pracy: **5 firm i 41 użytkowników** — te dwie liczby są stałe i od nich zależą scenariusze izolacji. Pozostałe rekordy generowane są losowo, więc ich liczba różni się między uruchomieniami; w szczególności liczba ofert waha się w okolicach dwustu. Liczby podane w rozdziale 4 pracy pochodzą z jednego konkretnego przebiegu.

Konta używane przez testy (zapisane na sztywno w `test-blackbox.mjs`):

```
admin@nestrealty.pl        administrator firmy
agent1@nestrealty.pl       agent
agent5@balticcoast.pl      konto do wyczerpania limitera
agent4@wroclawcity.pl      konto do oceny ryzyka
hasło do wszystkich:  DemoPass123!
```

---

## 4. Testy bez uruchomionych serwerów

```bat
rem 23 asercje — bezpieczeństwo warstwy danych  (rys. 4.3)
cd /d %DB%
npm run test:security

rem 27 asercji — bezpieczeństwo warstwy aplikacyjnej  (rys. 4.4)
cd /d %APP%
npm run test:security

rem mikro-pomiary kosztu mechanizmów  (tab. 4.6, rys. 4.8)
npm run bench:security

rem weryfikacja łańcucha skrótów na rzeczywistym dzienniku  (rys. 4.6)
cd /d %DB%
npm run verify:audit
```

**Pakiet warstwy danych (23 asercje)** obejmuje: sześć scenariuszy manipulacji dziennikiem audytu (tab. 4.3), reguły ochronne GraphQL wraz z kontrolą, że schemat produkcyjny nie zawiera relacji rekurencyjnej (tab. 4.4), szyfrowanie sekretów drugiego składnika, kanonizację wpisu dziennika oraz koszt funkcji skrótu haseł.

**Pakiet warstwy aplikacyjnej (27 asercji)** obejmuje: detekcję wstrzyknięć promptu na korpusie 25 ładunków i 15 zapytań poprawnych (tab. 4.2, rys. 4.5), limiter okna przesuwnego (rys. 4.7), 12 asercji oceny ryzyka logowania (tab. 3.1) oraz 8 pomiarów granicznych progów zapobiegania utracie danych (tab. 3.4).

---

## 5. Uruchomienie serwerów

Dwa **osobne** okna `cmd.exe`. W każdym ustaw najpierw `%APP%` / `%DB%`.

```bat
rem okno 1 — backend GraphQL, port 4000
cd /d %DB%
npm start
```

```bat
rem okno 2 — aplikacja, port 3000
rem WAŻNE: wersja produkcyjna, nie `npm run dev` — pomiary k6 tego wymagają,
rem a introspekcja GraphQL wyłącza się dopiero przy NODE_ENV=production
cd /d %APP%
npm run build
npm start
```

Sprawdź, że oba odpowiadają:

```bat
curl -s -o NUL -w "app:%%{http_code}\n" http://localhost:3000
curl -s -o NUL -w "gql:%%{http_code}\n" http://localhost:4000/graphql
```

---

## 6. Testy wymagające działającej instancji

**Kolejność jest istotna. `test:blackbox` na końcu.**

```bat
rem 30 asercji — regresja autoryzacji  (rys. 4.1)
cd /d %DB%
npm run test:authz

rem 18 podstron — przegląd interfejsu
cd /d %APP%
npm run test:smoke

rem 27 asercji — testy czarnoskrzynkowe  (tab. 4.1, 4.7; rys. 4.2)
rem URUCHOM JAKO OSTATNI — wyczerpuje limiter logowania
npm run test:blackbox
```

### Cicha pułapka w `test:authz`

Przy niezgodnym `SEED_ADMIN_EMAIL`, `COMPANYADMIN_EMAIL` lub `DEMO_PASSWORD` skrypt **pomija** testy zamiast je oblać:

```
PASS: 3   FAIL: 0   POMINIĘTO: 28
```

— co wygląda jak sukces. **Wynik jest ważny tylko przy `POMINIĘTO: 0` i `PASS: 30`.**

### Po `test:blackbox`

Limiter jest wyczerpany, logowanie zablokowane. Przed krokiem 7 **zrestartuj backend** (Ctrl+C w oknie 1, potem `npm start`).

---

## 7. Testy wydajnościowe

Wymagają k6 i obu serwerów. **Restartuj backend bezpośrednio przed każdym z dwóch przebiegów.**

```bat
rem ścieżka logowania — 9 pomiarów  (tab. 4.7, rys. 4.9)
cd /d %APP%
npm run perf:login
```

Zrestartuj backend, a potem:

```bat
rem punkty końcowe + weryfikacja limitu 600 op./min  (tab. 4.7, rys. 4.10)
cd /d %APP%
npm run perf:endpoints
```

Małe liczebności prób (8 i 9 pomiarów) wynikają wprost z limitu dziesięciu prób logowania w oknie piętnastu minut oraz z kosztu płatnych wywołań modelu. Praca omawia to w podrozdziale „Ograniczenia przeprowadzonych badań".

---

## 8. Tabela zgodności z rozdziałem 4

| # | Polecenie | Repozytorium | Oczekiwany wynik | Gdzie w pracy | ☐ |
|---|---|---|---|---|---|
| 1 | `npm run test:authz` | `realty-nest-db` | **PASS: 30, FAIL: 0, POMINIĘTO: 0** | rys. 4.1 | ☐ |
| 2 | `npm run test:security` | `realty-nest-db` | **23 PASS** | rys. 4.3 | ☐ |
| 3 | `npm run test:security` | `realty-nest` | **27 PASS** | rys. 4.4 | ☐ |
| 4 | `npm run test:blackbox` | `realty-nest` | **PASS: 27, FAIL: 0** | tab. 4.1, 4.7; rys. 4.2 | ☐ |
| | **suma** | | **107 pozycji** (30+23+27+27) | tab. 4.2 | ☐ |
| 5 | `npm run verify:audit` | `realty-nest-db` | status **INTACT** | rys. 4.6 | ☐ |
| 6 | `npm run test:smoke` | `realty-nest` | **18 podstron bez błędu** | — | ☐ |
| 7 | `npm run bench:security` | `realty-nest` | bcrypt 10→12 ≈ **3,9×** | tab. 4.6, rys. 4.8 | ☐ |
| 8 | `npm run perf:login` | `realty-nest` | **9 pomiarów**, mediana rzędu 0,5 s | tab. 4.7, rys. 4.9 | ☐ |
| 9 | `npm run perf:endpoints` | `realty-nest` | limiter **600 / 100** | tab. 4.7, rys. 4.10 | ☐ |

### Wartości, które **muszą** się zgadzać co do jednego

Liczby asercji **30 / 23 / 27 / 27** i suma **107**. Status **INTACT**. Licznik limitera **600/100**. Skuteczność detekcji **23 z 25 (92%)** przy **zerze fałszywych alarmów na 15 zapytaniach poprawnych**. Krotność bcrypt 10→12 w przedziale **3,9–4,0**. Wszystkie scenariusze **AU-01…AU-05 wykryte**, każdy ze wskazaniem właściwego numeru wpisu.

### Wartości, które **będą się różnić** i to jest w porządku

**Liczba wpisów w `verify:audit`** — dziennik rośnie z każdym przebiegiem. W pracy podano 1566; istotny jest status `INTACT`, nie liczba.

**Czasy bezwzględne** — zależą od obciążenia maszyny. W pracy: 2,3 µs (detekcja promptu), 10,5 µs (wpis audytu), 4,8 ms (weryfikacja łańcucha 500 wpisów), 91,7 ms (bcrypt 10), 360,9 ms (bcrypt 12). Istotne, by zachowały ten sam rząd wielkości i by krotność bcrypt pozostała bliska 4.

**Liczby rekordów po seedzie** — dane są częściowo losowe.

---

## 9. Rozwiązywanie problemów

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| `Unknown file extension ".ts"` | Node starszy niż 22.18 | sprawdź `node --version` |
| `Missing required environment variables: AUTH_SECRET, GRAPHQL_INTERNAL_URL` | brak `.env.local` | krok 1.2 |
| `AUTH_SECRET must be at least 32 characters` | za krótki sekret | wydłuż wartość |
| `TOTP_ENCRYPT_KEY must be 64 hex characters` | zły format klucza | wygeneruj poleceniem z 1.2 |
| błąd o nieistniejącej ścieżce `data\...` | brak uprawnień do zapisu w katalogu aplikacji | sprawdzić uprawnienia; katalog powstaje sam |
| `Cannot find module '../../realty-nest-db/node_modules/bcryptjs'` | repozytoria nie leżą obok siebie | krok 0.1 i 1.1 |
| `k6` nie jest rozpoznawane jako polecenie | k6 nie jest pakietem npm | `winget install k6` |
| `test:authz` → `POMINIĘTO: 28` | adresy w `.env` nie zgadzają się z seedem | krok 1.2 i 6 |
| logowanie odrzucane po testach | limiter wyczerpany przez `test:blackbox` | zrestartuj backend |
| `perf:login` zwraca same odmowy | limiter wyczerpany | zrestartuj backend przed przebiegiem |
| asystent zwraca 503 | brak `GEMINI_API_KEY` | uzupełnij klucz albo pomiń wiersz asystenta |

---

## 10. Zgodność frontendu ze schematem GraphQL

Wszystkie zapytania frontendu są zgodne ze schematem backendu, a `test:smoke` przechodzi
komplet **18 podstron bez zgłoszeń**.

Wcześniejszy rozjazd (siedem podstron zwracających `HTTP 400`) usunięto, uzupełniając
backend o brakujące elementy schematu: moduł kopii zapasowych (`getBackups`,
`getBackupById`, `recordBackup`, `dumpDatabase`), zatwierdzanie treści oferty
(`contentApprovedAt` wraz z `publishPropertyContent` / `unpublishPropertyContent`),
publiczny widok oferty (`getPublicProperty`), operacje RODO na kontakcie
(`exportContactData`, `hardDeleteContact`), pola prezentacyjne kanbanu i relację
kampania–zapytanie (`enquiryId`, `enquiryName`), listy kontrolne transakcji
(`checklist`, `TransactionChecklistItemInput`) oraz zestawienie prowizji
(`getCommissionSummary`).

Zgodność można sprawdzić w dowolnym momencie, walidując każde zapytanie frontendu
wobec schematu zbudowanego z `typeDefs` backendu — przy rozbieżności walidator
wskazuje pole i plik, w którym ono występuje.

---

## 11. Znane ograniczenia tego zestawu

**Scenariusz SEC-08** jest w pakiecie czarnoskrzynkowym potwierdzeniem odsyłającym, nie niezależną asercją: powołuje się na scenariusze AU-01…AU-05 wykonane na łańcuchu 500 wpisów w pakiecie warstwy danych. Praca zaznacza to przypisem pod tabelą 4.7.

**Reguły kontroli dostępu wspólnej fabryki resolwerów** nie mają osobnego pakietu modułowego — te same reguły egzekwowane są w każdym module domenowym i podlegają sprawdzeniu przy każdym wywołaniu przez interfejs, co pokrywają RG-03, RG-06, RG-08 i RG-12 z pakietu regresyjnego. Sam kod reguł przedstawia listing w podrozdziale 3.4.

**Brak ciągłej integracji** — trzy pakiety wymagają działającej instancji z bazą demonstracyjną, a jeden płatnego dostępu do interfejsu modelu językowego, dlatego przebiegi uruchamiane są ręcznie.

**Konfiguracja jednowęzłowa** — liczniki limiterów, pętla audytu i stan drugiego składnika żyją w pamięci jednego procesu, co nie odzwierciedla zachowania za load balancerem.

---

## 12. Materiały do pracy (opcjonalne)

Po wykonaniu przebiegów można odtworzyć zrzuty konsoli zamieszczone w rozdziale czwartym:

```bat
cd /d %APP%
node scripts/thesis-terminal-figures.mjs
```

Generator odtwarza osiem zrzutów do `images/terminal/`. Nagłówki sekcji odsyłają do numerów tabel i rysunków obowiązujących w obecnej wersji pracy.
