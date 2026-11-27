// Polish for Spanish speakers — cumulative review of A1 units 4–6, printed at the end of unit 6 in
// the workbook (phase "review") and available in the app with the unit 6B exercises.
//   node infrastructure/content-authoring/pl-es-a1-review-4-6.mjs
import { kit, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const r = kit(6, "pl-es-unit-6-plans", 6900, COURSE);
const R = "Repaso 4–6. ";
r.gap(
  "pl-es-r46-accusative",
  "review",
  `${R}Completa con el acusativo después de poproszę.`,
  "Kawa → kawę; herbata → herbatę; sok → sok.",
  "Poproszę ___ (kawa), ___ (herbata) i ___ (sok).",
  [["kawę"], ["herbatę"], ["sok"]],
);
r.mc(
  "pl-es-r46-chcialabym",
  "review",
  `${R}Eres mujer y pides con cortesía. ¿Qué dices?`,
  "Mujer: chciałabym.",
  ["Chciałabym wodę.", "Chciałbym wodę.", "Chcę bym wodę."],
);
r.gap(
  "pl-es-r46-zloty",
  "review",
  `${R}Completa con złoty, złote o złotych.`,
  "1 złoty; 2–4 złote; 5+ złotych.",
  "Woda kosztuje trzy ___, kawa dwanaście ___, a ciastko jeden ___.",
  [["złote"], ["złotych"], ["złoty"]],
);
r.mc("pl-es-r46-z-bez", "review", `${R}¿Cuál es correcto?`, "Z + instrumental; bez + genitivo.", [
  "Kawa z mlekiem, bez cukru.",
  "Kawa z mleko, bez cukier.",
  "Kawa z mleka, bez cukrem.",
]);
r.gap(
  "pl-es-r46-jesc-pic",
  "review",
  `${R}Completa con jem o piję.`,
  "La sopa se come: jem; el café se bebe: piję.",
  "Na obiad ___ zupę, a potem ___ kawę.",
  [["jem"], ["piję"]],
);
r.mc(
  "pl-es-r46-nie-jem",
  "review",
  `${R}¿Cómo dices «no como carne»?`,
  "Negación + genitivo: mięsa.",
  ["Nie jem mięsa.", "Nie jem mięso.", "Nie jem mięsem."],
);
r.mc(
  "pl-es-r46-smakuja",
  "review",
  `${R}¿Cómo dices «me gustan los pierogi» (al comerlos)?`,
  "Smakować como gustar: smakują mi.",
  ["Smakują mi pierogi.", "Smakuję pierogi.", "Pierogi mi smakuje."],
);
r.gap(
  "pl-es-r46-sie",
  "review",
  `${R}Completa con el verbo con się.`,
  "Budzę się, myjesz się, ubiera się.",
  "Ja ___ się o szóstej, ty ___ się szybko, a on ___ się elegancko.",
  [["budzę"], ["myjesz"], ["ubiera"]],
);
r.mc(
  "pl-es-r46-o-ktorej",
  "review",
  `${R}Completa: Wstaję o ___ (7).`,
  "O + locativo femenino: o siódmej.",
  ["siódmej", "siedem", "siódma"],
);
r.mc(
  "pl-es-r46-wpol",
  "review",
  `${R}¿Qué hora es wpół do ósmej?`,
  "Media hora antes de las ocho: 7:30.",
  ["7:30", "8:30", "8:00"],
);
r.gap(
  "pl-es-r46-days",
  "review",
  `${R}Completa con w / we + día.`,
  "Środa → w środę; wtorek → we wtorek; sobota → w sobotę.",
  "Sprzątam ___ (środa), piorę ___ (wtorek), a odpoczywam ___ (sobota).",
  [["w środę"], ["we wtorek"], ["w sobotę"]],
);
r.mc("pl-es-r46-musze", "review", `${R}¿Cuál es correcto?`, "Muszę + infinitivo.", [
  "Muszę sprzątać kuchnię.",
  "Muszę sprzątam kuchnię.",
  "Muszę do sprzątać kuchnię.",
]);
r.mc(
  "pl-es-r46-czasu",
  "review",
  `${R}¿Cómo dices «no tengo tiempo»?`,
  "Negación + genitivo: czasu.",
  ["Nie mam czasu.", "Nie mam czas.", "Nie jestem czas."],
);
r.mc(
  "pl-es-r46-lubie",
  "review",
  `${R}¿Cómo dices «me gustan los gatos»?`,
  "Lubić concuerda con la persona: lubię koty.",
  ["Lubię koty.", "Lubią mi koty.", "Koty mi lubię."],
);
r.mc("pl-es-r46-nie-lubie", "review", `${R}¿Cuál es correcto?`, "Nie lubię + genitivo.", [
  "Nie lubię piłki nożnej.",
  "Nie lubię piłkę nożną.",
  "Nie lubię piłka nożna.",
]);
r.mc(
  "pl-es-r46-ja-tez-nie",
  "review",
  `${R}— Nie lubię zimy. Tú tampoco. ¿Qué dices?`,
  "Coincides con una negación: ja też nie.",
  ["Ja też nie.", "Ja też.", "A ja tak."],
);
r.mc(
  "pl-es-r46-grac",
  "review",
  `${R}Completa: Gram ___ tenisa i ___ gitarze.`,
  "Grać w + juego; grać na + instrumento.",
  ["w / na", "na / w", "w / w"],
);
r.mc(
  "pl-es-r46-umiem",
  "review",
  `${R}Nunca has aprendido a nadar. ¿Qué dices?`,
  "Falta de habilidad: nie umiem.",
  ["Nie umiem pływać.", "Nie mogę pływać.", "Nie wiem pływać."],
);
r.mc(
  "pl-es-r46-znam",
  "review",
  `${R}¿Cómo dices «conozco Cracovia»?`,
  "Lugares y personas: znać.",
  ["Znam Kraków.", "Wiem Kraków.", "Umiem Kraków."],
);
r.ta(
  "pl-es-r46-translate-order",
  "review",
  `${R}Escribe en polaco: Un té con limón y una tarta de queso, por favor.`,
  "Poproszę herbatę z cytryną i sernik.",
  [
    "Poproszę herbatę z cytryną i sernik.",
    "Herbatę z cytryną i sernik, poproszę.",
    "Poproszę herbatę z cytryną i kawałek sernika.",
  ],
);
r.ta(
  "pl-es-r46-translate-day",
  "review",
  `${R}Escribe en polaco: Nunca desayuno en casa.`,
  "Nigdy nie jem śniadania w domu.",
  ["Nigdy nie jem śniadania w domu.", "W domu nigdy nie jem śniadania."],
);
r.ta(
  "pl-es-r46-translate-invite",
  "review",
  `${R}Escribe en polaco: ¿Te apetece jugar al voleibol el sábado?`,
  "Masz ochotę zagrać w siatkówkę w sobotę?",
  [
    "Masz ochotę zagrać w siatkówkę w sobotę?",
    "Masz ochotę grać w siatkówkę w sobotę?",
    "Masz ochotę w sobotę zagrać w siatkówkę?",
  ],
);
r.write(
  "pl-es-r46-write-week",
  "review",
  `${R}Escribe sobre tu semana: tu rutina con horas, tus obligaciones, lo que te gusta hacer y un plan con un amigo (cuándo, a qué hora y dónde quedáis).`,
  "Usa lo que sabes de las unidades 4–6: verbos con się, o + hora, musieć, lubić, umówić się / spotykać się.",
  "Od poniedziałku do piątku budzę się o siódmej i o ósmej jadę do pracy. W środę muszę robić zakupy, a w sobotę sprzątam mieszkanie. W wolnym czasie lubię czytać i gotować, ale nie lubię piłki nożnej. W niedzielę spotykam się z Kasią o jedenastej w kawiarni na rynku.",
  ["rutina y horas", "obligaciones", "gustos", "plan con un amigo"],
  40,
  120,
  9,
);
console.log("review 4-6 saved", r.save(), "unit 6 (pl-es) total", renumber(6, { ...COURSE }));
