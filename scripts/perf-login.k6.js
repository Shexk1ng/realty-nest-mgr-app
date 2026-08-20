/**
 * Pomiar opóźnienia pełnej ścieżki logowania (tabela 4.7 pracy).
 *
 * Ścieżka obejmuje weryfikację hasła funkcją bcrypt przy koszcie dwunastu,
 * ocenę ryzyka logowania, zapis wpisu dziennika audytowego i wydanie tokenu
 * dostępu. Scenariusz jest wydzielony do osobnego przebiegu, ponieważ punkt
 * logowania celowo dopuszcza tylko dziesięć prób w oknie piętnastu minut,
 * licząc je zarówno dla konta, jak i dla adresu źródłowego. Liczba próbek
 * jest więc ograniczona konstrukcją systemu, a nie doborem narzędzia:
 * dziewięć logowań na dziewięciu różnych kontach mieści się w budżecie
 * adresu, przy czym przebieg wymaga świeżego okna limitera.
 *
 * Uruchomienie (po restarcie backendu, aby okno limitera było puste):
 *   k6 run scripts/perf-login.k6.js
 */

import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const APP = "http://localhost:3000";
const PASSWORD = "DemoPass123!";

const KONTA = [
  "admin@nestrealty.pl", "manager@nestrealty.pl",
  "agent1@nestrealty.pl", "agent2@nestrealty.pl", "agent3@nestrealty.pl",
  "agent4@nestrealty.pl", "agent5@nestrealty.pl", "agent6@nestrealty.pl",
  "assistant1@nestrealty.pl",
];

const tLogin = new Trend("t_logowanie", true);

export const options = {
  scenarios: {
    logowanie: { executor: "shared-iterations", vus: 1, iterations: KONTA.length,
                 maxDuration: "2m" },
  },
  thresholds: { t_logowanie: ["p(95)<3000"] },
};

export default function () {
  const email = KONTA[__ITER % KONTA.length];
  const r = http.post(`${APP}/api/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } });
  if (r.status === 200) tLogin.add(r.timings.duration);
  check(r, { "logowanie: 200": (x) => x.status === 200 });
}
