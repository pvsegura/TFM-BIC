// Cumulative review of A1 units 4–6 (Spanish for Polish speakers), printed at the end of unit 6 in
// the workbook (phase "review") and available in the app with the unit 6B exercises.
//   node infrastructure/content-authoring/a1-review-4-6.mjs
import { kit, renumber } from "./ex-kit.mjs";

const r = kit(6, "es-unit-6-plans", 1000);
const R = "Powtórka 4–6. ";
r.mc(
  "es-r46-order-bar",
  "review",
  `${R}Zamawiasz grzecznie kawę z mlekiem w barze. Co mówisz?`,
  "Grzecznie: ¿Me pone…? albo Quería…, por favor.",
  [
    "¿Me pone un café con leche, por favor?",
    "Dame café con leche.",
    "Yo quiero café con leche ahora.",
  ],
);
r.gap(
  "es-r46-querer",
  "review",
  `${R}Uzupełnij formami querer (e → ie).`,
  "Quiero, quieres, queremos.",
  "Yo ___ un té, ¿tú qué ___? Nosotros ___ la cuenta.",
  [["quiero"], ["quieres"], ["queremos"]],
);
r.mc(
  "es-r46-preferir",
  "review",
  `${R}Uzupełnij: — ¿Carne o pescado? — ___ pescado.`,
  "Preferir: prefiero (e → ie).",
  ["Prefiero", "Prefero", "Me prefiero"],
);
r.mc(
  "es-r46-bill",
  "review",
  `${R}Jak poprosisz o rachunek?`,
  "La cuenta, por favor / ¿Nos trae la cuenta?",
  ["La cuenta, por favor.", "El billete, por favor.", "La factura de luz, por favor."],
);
r.gap(
  "es-r46-reflexive",
  "review",
  `${R}Uzupełnij zaimkiem zwrotnym.`,
  "Me levanto, te duchas, se acuesta.",
  "Yo ___ levanto a las siete, tú ___ duchas y mi hermano ___ acuesta tarde.",
  [["me"], ["te"], ["se"]],
);
r.mc(
  "es-r46-time",
  "review",
  `${R}Jest 8:45. Jak to powiesz?`,
  "Menos cuarto: son las nueve menos cuarto.",
  [
    "Son las nueve menos cuarto.",
    "Son las ocho y cuarenta y cinco menos.",
    "Es la nueve menos cuarto.",
  ],
);
r.mc("es-r46-a-las", "review", `${R}Uzupełnij: Como ___ dos.`, "O godzinie: a la una, a las dos.", [
  "a las",
  "en las",
  "a la",
]);
r.gap(
  "es-r46-days",
  "review",
  `${R}Uzupełnij: el / los przed dniem tygodnia.`,
  "Jeden konkretny dzień: el lunes; co tydzień: los lunes.",
  "___ lunes voy al gimnasio (co tydzień), pero ___ sábado que viene voy a la playa.",
  [["los"], ["el"]],
);
r.mc(
  "es-r46-tener-que",
  "review",
  `${R}Jak powiesz „Muszę sprzątać”?`,
  "Tener que + bezokolicznik.",
  ["Tengo que limpiar.", "Tengo limpiar.", "Debo de limpio."],
);
r.mc(
  "es-r46-yo-irregular",
  "review",
  `${R}Która forma yo jest poprawna?`,
  "Hacer → hago; salir → salgo; poner → pongo.",
  ["hago, salgo, pongo", "hazo, salo, pono", "haco, sallo, poneo"],
);
r.gap(
  "es-r46-gusta",
  "review",
  `${R}Uzupełnij gusta albo gustan.`,
  "Jedna rzecz / czynność: gusta; wiele rzeczy: gustan.",
  "Me ___ el cine y me ___ las series, pero no me ___ madrugar.",
  [["gusta"], ["gustan"], ["gusta"]],
);
r.mc(
  "es-r46-le-gusta",
  "review",
  `${R}Jak powiesz „Moja mama lubi czytać”?`,
  "A + osoba + le gusta.",
  ["A mi madre le gusta leer.", "Mi madre gusta leer.", "A mi madre la gusta leer."],
);
r.mc(
  "es-r46-tampoco",
  "review",
  `${R}— No me gusta el fútbol. Ty też nie. Co mówisz?`,
  "Zgoda z przeczeniem: a mí tampoco.",
  ["A mí tampoco.", "A mí también.", "Yo tampoco gusto."],
);
r.mc(
  "es-r46-jugar-tocar",
  "review",
  `${R}Uzupełnij: ___ al tenis y ___ el piano.`,
  "Gra: jugar a; instrument: tocar.",
  ["Juego / toco", "Toco / juego", "Juego / juego"],
);
r.mc(
  "es-r46-saber-poder",
  "review",
  `${R}Nigdy nie uczyłeś się jeździć na nartach. Co mówisz?`,
  "Brak umiejętności: no sé.",
  ["No sé esquiar.", "No puedo esquiar.", "No conozco esquiar."],
);
r.mc(
  "es-r46-quedar",
  "review",
  `${R}Jak zapytasz, o której się spotykacie?`,
  "Quedar = umówić się; o godzinę pytasz ¿A qué hora…? (bez se, bo nie zostajesz w domu).",
  ["¿A qué hora quedamos?", "¿A qué hora nos quedamos en casa?", "¿Qué hora quedamos?"],
);
r.mc(
  "es-r46-refuse",
  "review",
  `${R}— ¿Quieres venir al cine? Nie możesz. Najgrzeczniejsza odpowiedź to…`,
  "Przeprosiny + powód + inny termin.",
  ["Lo siento, no puedo, tengo que trabajar. ¿Otro día?", "No.", "No quiero."],
);
r.mc(
  "es-r46-apetece",
  "review",
  `${R}Uzupełnij: ¿Te ___ tomar algo?`,
  "Apetecer działa jak gustar: te apetece.",
  ["apetece", "apeteces", "apetezco"],
);
r.ta(
  "es-r46-translate-menu",
  "review",
  `${R}Napisz po hiszpańsku: Na pierwsze danie zupę, a na drugie rybę.`,
  "De primero…, de segundo…",
  [
    "De primero sopa y de segundo pescado.",
    "De primero, sopa, y de segundo, pescado.",
    "De primero quiero sopa y de segundo pescado.",
  ],
);
r.ta(
  "es-r46-translate-day",
  "review",
  `${R}Napisz po hiszpańsku: Zawsze wstaję o siódmej.`,
  "Siempre me levanto a las siete.",
  ["Siempre me levanto a las siete.", "Me levanto siempre a las siete."],
);
r.ta(
  "es-r46-translate-likes",
  "review",
  `${R}Napisz po hiszpańsku: Uwielbiam tańczyć, ale nie lubię śpiewać.`,
  "Me encanta bailar, pero no me gusta cantar.",
  ["Me encanta bailar, pero no me gusta cantar.", "Me encanta bailar pero no me gusta cantar."],
);
r.ta(
  "es-r46-translate-invite",
  "review",
  `${R}Napisz po hiszpańsku: Chcesz zagrać w tenisa w sobotę?`,
  "¿Quieres jugar al tenis el sábado?",
  ["¿Quieres jugar al tenis el sábado?", "¿Quieres jugar al tenis este sábado?"],
);
r.write(
  "es-r46-write-week",
  "review",
  `${R}Napisz o swoim tygodniu: rutyna, obowiązki, co lubisz robić w wolnym czasie i jeden plan ze znajomym (gdzie i o której się umawiacie).`,
  "Użyj tego, co znasz z jednostek 4–6: czasowniki zwrotne, godziny, tener que, gustar, quedar.",
  "De lunes a viernes me levanto a las siete y trabajo de nueve a cinco. Los martes tengo que hacer la compra y los sábados limpio la casa. En mi tiempo libre me encanta leer y me gusta mucho cocinar, pero no me gusta nada el fútbol. Este domingo quedo con Ana a las once en un bar del centro para tomar un café.",
  ["rutyna i godziny", "obowiązki", "upodobania", "plan ze znajomym"],
  40,
  120,
  9,
);
console.log("review 4-6 saved", r.save(), "unit 6 total", renumber(6));
