// Cumulative review of A1 units 7–9 (Spanish for Polish speakers), printed at the end of unit 9 in
// the workbook (phase "review") and available in the app with the unit 9B exercises.
//   node infrastructure/content-authoring/a1-review-7-9.mjs
import { kit, renumber } from "./ex-kit.mjs";

const r = kit(9, "es-unit-9-holidays", 1000);
const R = "Powtórka 7–9. ";
r.gap(
  "es-r79-demonstratives",
  "review",
  `${R}Uzupełnij: este / esa / aquellos.`,
  "Blisko mnie: este; blisko ciebie: esa; daleko: aquellos.",
  "Me gusta ___ jersey (blisko mnie), ___ falda (przy tobie) y ___ zapatos (tam daleko).",
  [["este"], ["esa"], ["aquellos"]],
);
r.mc(
  "es-r79-colour",
  "review",
  `${R}Uzupełnij: unas botas ___`,
  "Kolor zgadza się z rzeczownikiem: botas (ż, l.mn.) → negras.",
  ["negras", "negros", "negra"],
);
r.mc(
  "es-r79-queda",
  "review",
  `${R}Spodnie są na ciebie za długie. Co mówisz?`,
  "Quedar jak gustar: me quedan largos.",
  [
    "Los pantalones me quedan largos.",
    "Yo quedo largo los pantalones.",
    "Los pantalones me queda larga.",
  ],
);
r.mc(
  "es-r79-lo",
  "review",
  `${R}— ¿Y el abrigo? — Biorę go. Co mówisz?`,
  "El abrigo → lo, przed czasownikiem: me lo llevo.",
  ["Me lo llevo.", "Me llevo lo.", "Me la llevo."],
);
r.match(
  "es-r79-hundreds",
  "review",
  `${R}Połącz liczby.`,
  "Quinientos, setecientos, novecientos są nieregularne.",
  [
    ["150", "ciento cincuenta"],
    ["500", "quinientos"],
    ["700", "setecientos"],
    ["900", "novecientos"],
  ],
);
r.gap(
  "es-r79-quantities",
  "review",
  `${R}Uzupełnij: ilość + de.`,
  "Un kilo de…, una docena de…, una botella de…",
  "Un kilo ___ tomates, una docena ___ huevos y una botella ___ agua.",
  [["de"], ["de"], ["de"]],
);
r.mc("es-r79-otro", "review", `${R}Chcesz jeszcze jeden chleb. Co mówisz?`, "Otra / otro bez un.", [
  "Otra barra de pan, por favor.",
  "Una otra barra de pan, por favor.",
  "Un otro pan, por favor.",
]);
r.mc("es-r79-mucha", "review", `${R}Uzupełnij: Hay ___ gente en el mercado.`, "Gente (ż): mucha.", [
  "mucha",
  "mucho",
  "muy",
]);
r.mc(
  "es-r79-hay-esta",
  "review",
  `${R}Które pytanie jest poprawne?`,
  "O konkretną rzecz: ¿Dónde está…?",
  ["¿Dónde está la cocina?", "¿Dónde hay la cocina?", "¿Dónde es la cocina?"],
);
r.mc("es-r79-mejor", "review", `${R}Uzupełnij: Este piso es ___ que el otro.`, "Bueno → mejor.", [
  "mejor",
  "más bueno",
  "más mejor",
]);
r.mc(
  "es-r79-primer",
  "review",
  `${R}Uzupełnij: Vivo en el ___ piso (3).`,
  "Tercero → tercer przed rzeczownikiem męskim.",
  ["tercer", "tercero", "tres"],
);
r.gap(
  "es-r79-gerund",
  "review",
  `${R}Uzupełnij estar + gerundio.`,
  "Estoy leyendo, está durmiendo, estamos comiendo.",
  "Yo ___ leyendo, mi hermano ___ durmiendo y nosotros ___ comiendo.",
  [["estoy"], ["está"], ["estamos"]],
);
r.gap(
  "es-r79-ser-estar",
  "review",
  `${R}Uzupełnij es / está.`,
  "Zawód, pochodzenie: es; miejsce, stan: está.",
  "Ana ___ médica, ___ de Toledo y hoy ___ muy cansada.",
  [["es"], ["es"], ["está"]],
);
r.mc(
  "es-r79-rica",
  "review",
  `${R}Chwalisz smak paelli, którą jesz. Co mówisz?`,
  "Smak teraz: está rica.",
  ["¡Está muy rica!", "¡Es muy rica!", "¡Hay muy rica!"],
);
r.mc("es-r79-weather", "review", `${R}Jak powiesz „Jest bardzo gorąco”?`, "Hace + mucho calor.", [
  "Hace mucho calor.",
  "Hace muy calor.",
  "Es mucho calor.",
]);
r.mc("es-r79-tengo-frio", "review", `${R}Jest ci zimno. Co mówisz?`, "Osoba: tengo frío.", [
  "Tengo frío.",
  "Estoy frío.",
  "Hace frío yo.",
]);
r.mc("es-r79-ir-a", "review", `${R}Które zdanie jest poprawne?`, "Ir + a + bezokolicznik.", [
  "Mañana va a llover.",
  "Mañana va llover.",
  "Mañana va a llueve.",
]);
r.mc(
  "es-r79-gustaria",
  "review",
  `${R}Marzysz o podróży do Argentyny. Co mówisz?`,
  "Marzenie: me gustaría.",
  ["Me gustaría ir a Argentina.", "Me gusta ir a Argentina.", "Me gustaría a ir en Argentina."],
);
r.gap(
  "es-r79-travel",
  "review",
  `${R}Uzupełnij przyimkiem: a, en, de.`,
  "Salgo de…, viajo en…, llego a…",
  "Salgo ___ Varsovia, viajo ___ avión y llego ___ Málaga a las tres.",
  [["de"], ["en"], ["a"]],
);
r.ta(
  "es-r79-translate-shop",
  "review",
  `${R}Napisz po hiszpańsku: Mogę przymierzyć tę sukienkę?`,
  "¿Puedo probarme este vestido?",
  ["¿Puedo probarme este vestido?", "¿Me puedo probar este vestido?"],
);
r.ta(
  "es-r79-translate-market",
  "review",
  `${R}Napisz po hiszpańsku: Poproszę pół kilo truskawek.`,
  "¿Me pone medio kilo de fresas? / Medio kilo de fresas, por favor.",
  [
    "¿Me pone medio kilo de fresas?",
    "Medio kilo de fresas, por favor.",
    "¿Me pone medio kilo de fresas, por favor?",
  ],
);
r.ta(
  "es-r79-translate-home",
  "review",
  `${R}Napisz po hiszpańsku: Łazienka jest obok sypialni.`,
  "El baño está al lado del dormitorio.",
  ["El baño está al lado del dormitorio."],
);
r.ta(
  "es-r79-translate-plan",
  "review",
  `${R}Napisz po hiszpańsku: W sierpniu pojadę nad morze.`,
  "En agosto voy a ir a la playa / al mar.",
  ["En agosto voy a ir a la playa.", "En agosto voy a ir al mar.", "En agosto voy a la playa."],
);
r.write(
  "es-r79-write-trip",
  "review",
  `${R}Napisz o weekendowym wyjeździe: dokąd i czym jedziesz, jaka będzie pogoda, gdzie będziesz spać (opisz pokój albo mieszkanie), co kupisz i co teraz robisz, żeby się przygotować.`,
  "Użyj tego, co znasz z jednostek 7–9: ir a, hace / va a hacer, hay / está, estar + gerundio, kolory i ilości.",
  "Este fin de semana voy a ir a Granada en tren. Va a hacer sol, pero por la noche va a hacer frío. Voy a dormir en un apartamento pequeño: hay un dormitorio, una cocina y un baño, y está al lado de la Alhambra. Quiero comprar una chaqueta azul y un kilo de naranjas para el viaje. Ahora estoy haciendo la maleta y mi compañero de piso está buscando el billete.",
  ["dokąd i czym", "pogoda", "nocleg", "zakupy", "estar + gerundio"],
  40,
  120,
  9,
);
console.log("review 7-9 saved", r.save(), "unit 9 total", renumber(9));
