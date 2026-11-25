// Cumulative review of A1 units 1–3, printed at the end of unit 3 in the workbook (phase "review")
// and available in the app with the unit 3B exercises.
//   node infrastructure/content-authoring/a1-review-1-3.mjs
import { kit, renumber } from "./ex-kit.mjs";

const r = kit(3, "es-unit-3-directions", 600);
r.mc(
  "es-r13-greeting",
  "review",
  "Powtórka 1–3. Jest 21:00. Jak się przywitasz?",
  "Wieczorem: buenas noches.",
  ["Buenas noches.", "Buenos días.", "Buenas tardes."],
);
r.mc(
  "es-r13-usted",
  "review",
  "Powtórka 1–3. Pytasz starszą panią o imię. Co powiesz?",
  "Forma usted: ¿Cómo se llama (usted)?",
  ["¿Cómo se llama usted?", "¿Cómo te llamas?", "¿Cómo se llaman?"],
);
r.gap(
  "es-r13-ser",
  "review",
  "Powtórka 1–3. Uzupełnij formami ser.",
  "Yo soy, ella es, nosotros somos.",
  "Yo ___ polaca, ella ___ española y nosotros ___ amigos.",
  [["soy"], ["es"], ["somos"]],
);
r.mc(
  "es-r13-nationality",
  "review",
  "Powtórka 1–3. Uzupełnij: Mi novia es ___ (Niemka).",
  "Alemán → alemana, małą literą.",
  ["alemana", "Alemana", "alemán"],
);
r.ta(
  "es-r13-age",
  "review",
  "Powtórka 1–3. Napisz po hiszpańsku słownie: Mam 33 lata.",
  "Tener + años; 33 = treinta y tres.",
  ["Tengo treinta y tres años."],
);
r.mc(
  "es-r13-cual",
  "review",
  "Powtórka 1–3. Uzupełnij: ¿___ es tu dirección?",
  "O konkretną informację pytamy ¿Cuál es…?",
  ["Cuál", "Qué", "Cómo"],
);
r.match(
  "es-r13-match-numbers",
  "review",
  "Powtórka 1–3. Połącz liczby.",
  "Quince 15, cincuenta 50, quinientos to już 500.",
  [
    ["15", "quince"],
    ["50", "cincuenta"],
    ["60", "sesenta"],
    ["70", "setenta"],
    ["100", "cien"],
  ],
);
r.mc(
  "es-r13-article",
  "review",
  "Powtórka 1–3. Uzupełnij: Tengo ___ hermana y ___ primos.",
  "Coś nowego: una (żeński), unos (męski mn.).",
  ["una / unos", "la / los", "un / unas"],
);
r.mc(
  "es-r13-possessive",
  "review",
  "Powtórka 1–3. Uzupełnij: ___ padres viven en Gdańsk (moi rodzice).",
  "Mi → mis w liczbie mnogiej.",
  ["Mis", "Mi", "Mío"],
);
r.mc(
  "es-r13-agreement",
  "review",
  "Powtórka 1–3. Wybierz poprawne zdanie.",
  "Przymiotnik zgadza się z rzeczownikiem: las casas blancas.",
  ["Las casas son blancas.", "Las casas son blancos.", "Las casas es blanca."],
);
r.mc(
  "es-r13-pelo",
  "review",
  "Powtórka 1–3. Ona ma kręcone włosy:",
  "Tener + el pelo + przymiotnik.",
  ["Tiene el pelo rizado.", "Es pelo rizado.", "Está el pelo rizado."],
);
r.gap(
  "es-r13-date",
  "review",
  "Powtórka 1–3. Napisz datę: 1 stycznia.",
  "W Hiszpanii zwykle el uno (rzadziej el primero) de enero.",
  "el ___ de ___",
  [["uno", "primero"], ["enero"]],
);
r.mc(
  "es-r13-hay-esta",
  "review",
  "Powtórka 1–3. Uzupełnij: ¿___ un banco por aquí? — Sí, ___ al lado del museo.",
  "Istnienie: hay; położenie konkretnego banku: está.",
  ["Hay / está", "Está / hay", "Hay / hay"],
);
r.mc(
  "es-r13-del",
  "review",
  "Powtórka 1–3. Uzupełnij: La parada está enfrente ___ hospital.",
  "De + el = del.",
  ["del", "de el", "de la"],
);
r.mc(
  "es-r13-ordinal",
  "review",
  "Powtórka 1–3. Uzupełnij: Mi oficina está en el ___ piso.",
  "Primero → primer przed rzeczownikiem męskim.",
  ["primer", "primero", "primera"],
);
r.mc(
  "es-r13-estar-state",
  "review",
  "Powtórka 1–3. Uzupełnij: Es tarde y el museo ya ___ cerrado.",
  "Stan chwilowy → estar.",
  ["está", "es", "hay"],
);
r.order(
  "es-r13-order-intro",
  "review",
  "Powtórka 1–3. Ułóż zdanie: To jest moja siostra, pracuje jako lekarka.",
  "Esta es… przy przedstawianiu; trabajar de + zawód bez rodzajnika.",
  ["Esta", "es", "mi", "hermana,", "trabaja", "de", "médica."],
);
r.ta(
  "es-r13-translate-where",
  "review",
  "Powtórka 1–3. Napisz po hiszpańsku: Gdzie jest dworzec?",
  "Konkretne miejsce → está.",
  ["¿Dónde está la estación?", "Dónde está la estación"],
);
r.ta(
  "es-r13-translate-languages",
  "review",
  "Powtórka 1–3. Napisz po hiszpańsku: Mówię po polsku, po angielsku i trochę po hiszpańsku.",
  "Hablar + języki bez „po”; un poco de.",
  ["Hablo polaco, inglés y un poco de español."],
);
r.write(
  "es-r13-write-profile",
  "review",
  "Powtórka 1–3. Napisz krótki profil do aplikacji językowej: imię, pochodzenie, wiek, rodzina, okolica, w której mieszkasz.",
  "Sprawdź ser/estar/tener, rodzajniki, zgodę przymiotników i hay/está.",
  "Hola, me llamo Ewa y soy polaca, de Poznań. Tengo treinta y un años. Estoy casada y tengo una hija de cinco años. Vivo en un barrio tranquilo. Cerca de mi casa hay un parque grande y el supermercado está en la esquina.",
  ["imię i pochodzenie", "wiek z tener", "rodzina", "okolica z hay i está"],
  30,
  110,
  8,
);
console.log("review 1-3", r.save(), "unit 3 total", renumber(3));
