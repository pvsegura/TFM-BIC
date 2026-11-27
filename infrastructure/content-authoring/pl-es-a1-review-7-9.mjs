// Polish for Spanish speakers — cumulative review of A1 units 7–9, printed at the end of unit 9 in
// the workbook (phase "review") and available in the app with the unit 9B exercises.
//   node infrastructure/content-authoring/pl-es-a1-review-7-9.mjs
import { kit, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const r = kit(9, "pl-es-unit-9-holidays", 9900, COURSE);
const R = "Repaso 7–9. ";
r.gap(
  "pl-es-r79-szukam",
  "review",
  `${R}Completa en genitivo después de szukam.`,
  "Kurtka → kurtki; sweter → swetra.",
  "Szukam ciepłej ___ (kurtka) i nowego ___ (sweter).",
  [["kurtki"], ["swetra"]],
);
r.mc("pl-es-r79-te", "review", `${R}¿Cuál es correcto?`, "Acusativo femenino de ta: tę.", [
  "Poproszę tę sukienkę.",
  "Poproszę ta sukienka.",
  "Poproszę ten sukienkę.",
]);
r.mc(
  "pl-es-r79-pasuje",
  "review",
  `${R}¿Cómo dices «estos pantalones me quedan bien»?`,
  "Pasować concuerda con la prenda: te spodnie mi pasują.",
  ["Te spodnie mi pasują.", "Ja pasuję te spodnie.", "Te spodnie mi pasuje."],
);
r.mc(
  "pl-es-r79-biore-je",
  "review",
  `${R}Te llevas los zapatos (buty). ¿Qué dices?`,
  "Plural de cosas: je.",
  ["Biorę je.", "Biorę ją.", "Biorę go."],
);
r.gap(
  "pl-es-r79-quantity",
  "review",
  `${R}Completa con el genitivo.`,
  "Kilo ziemniaków (pl.), litr mleka (sg.), dziesięć jajek (pl.).",
  "Poproszę kilo ___ (ziemniak), litr ___ (mleko) i dziesięć ___ (jajko).",
  [["ziemniaków"], ["mleka"], ["jajek"]],
);
r.mc("pl-es-r79-dwie", "review", `${R}¿Cómo dices «dos cebollas»?`, "Femenino: dwie + plural.", [
  "dwie cebule",
  "dwa cebule",
  "dwie cebul",
]);
r.mc("pl-es-r79-deka", "review", `${R}¿Cuánto es dwadzieścia deka sera?`, "Deko = 10 g: 200 g.", [
  "200 g de queso.",
  "20 g de queso.",
  "2 kg de queso.",
]);
r.gap(
  "pl-es-r79-position",
  "review",
  `${R}Completa con stoi, leży o wisi.`,
  "Cuadro → wisi; libro en la mesa → leży; sofá → stoi.",
  "Nad kanapą ___ obraz, na stole ___ książka, a pod oknem ___ fotel.",
  [["wisi"], ["leży"], ["stoi"]],
);
r.mc("pl-es-r79-pod-oknem", "review", `${R}¿Cuál es correcto?`, "Pod + instrumental: pod oknem.", [
  "Kanapa stoi pod oknem.",
  "Kanapa stoi pod okno.",
  "Kanapa stoi pod okna.",
]);
r.mc(
  "pl-es-r79-wiekszy",
  "review",
  `${R}¿Cómo dices «mi piso es más grande que el tuyo»?`,
  "Duży → większy; niż + nominativo.",
  [
    "Moje mieszkanie jest większe niż twoje.",
    "Moje mieszkanie jest bardziej duże niż twoje.",
    "Moje mieszkanie jest większe od twoje.",
  ],
);
r.mc(
  "pl-es-r79-pietro",
  "review",
  `${R}¿Cómo dices «vivo en el segundo piso»?`,
  "Na + locativo: na drugim piętrze.",
  ["Mieszkam na drugim piętrze.", "Mieszkam w drugie piętro.", "Mieszkam na dwa piętro."],
);
r.gap(
  "pl-es-r79-imperative",
  "review",
  `${R}Completa con postaw, połóż o powieś.`,
  "De pie → postaw; tumbado → połóż; colgado → powieś.",
  "___ lampę w kącie, ___ klucze na stole i ___ obraz nad łóżkiem.",
  [["Postaw"], ["Połóż"], ["Powieś"]],
);
r.mc(
  "pl-es-r79-wlasnie",
  "review",
  `${R}¿Cómo dices «estoy haciendo la cena»?`,
  "Presente + właśnie.",
  ["Właśnie robię kolację.", "Jestem robiąc kolację.", "Jestem robię kolację."],
);
r.mc("pl-es-r79-weather", "review", `${R}¿Cuál es correcto?`, "El sol świeci; la nieve pada.", [
  "Świeci słońce i pada śnieg.",
  "Pada słońce i świeci śnieg.",
  "Wieje słońce i pada śnieg.",
]);
r.mc("pl-es-r79-mi-zimno", "review", `${R}¿Cómo dices «tengo frío»?`, "Dativo: jest mi zimno.", [
  "Jest mi zimno.",
  "Jestem zimno.",
  "Mam zimno.",
]);
r.mc(
  "pl-es-r79-bedzie",
  "review",
  `${R}¿Cuál es correcto?`,
  "Futuro: będzie + infinitivo; negación + genitivo.",
  [
    "Jutro będzie padać, ale nie będzie wiatru.",
    "Jutro jest padać, ale nie będzie wiatr.",
    "Jutro będzie pada, ale nie jest wiatru.",
  ],
);
r.gap(
  "pl-es-r79-destinations",
  "review",
  `${R}Completa con nad, w, na o do.`,
  "Nad morze, w góry, na wieś, do Hiszpanii.",
  "Latem jadę ___ morze, potem ___ góry, a na święta ___ Hiszpanii.",
  [["nad"], ["w"], ["do"]],
);
r.mc(
  "pl-es-r79-pojade",
  "review",
  `${R}¿Cuál es correcto?`,
  "El perfectivo ya es futuro: pojadę.",
  ["W lipcu pojadę na Mazury.", "W lipcu będę pojechać na Mazury.", "W lipcu pojadę do Mazury."],
);
r.mc(
  "pl-es-r79-na-tydzien",
  "review",
  `${R}¿Cómo dices «voy para una semana»?`,
  "Na + acusativo: na tydzień.",
  ["Jadę na tydzień.", "Jadę przez tydzień.", "Jadę w tydzień."],
);
r.ta(
  "pl-es-r79-translate-shop",
  "review",
  `${R}Escribe en polaco: ¿Puedo probármelo? (el jersey)`,
  "Czy mogę go przymierzyć?",
  ["Czy mogę go przymierzyć?", "Mogę go przymierzyć?"],
);
r.ta(
  "pl-es-r79-translate-market",
  "review",
  `${R}Escribe en polaco: Medio kilo de fresas, por favor.`,
  "Poproszę pół kilo truskawek.",
  ["Poproszę pół kilo truskawek.", "Pół kilo truskawek, poproszę."],
);
r.ta(
  "pl-es-r79-translate-home",
  "review",
  `${R}Escribe en polaco: El dormitorio está al lado del baño.`,
  "Sypialnia jest obok łazienki.",
  ["Sypialnia jest obok łazienki."],
);
r.ta(
  "pl-es-r79-translate-future",
  "review",
  `${R}Escribe en polaco: Mañana nevará.`,
  "Jutro będzie padać śnieg.",
  ["Jutro będzie padać śnieg.", "Jutro będzie padał śnieg."],
);
r.write(
  "pl-es-r79-write-trip",
  "review",
  `${R}Escribe sobre una escapada de fin de semana: adónde y cómo vas, qué tiempo hará, cómo es el sitio donde dormirás, qué compras antes de salir y qué estás haciendo ahora para prepararte.`,
  "Usa lo que sabes de las unidades 7–9: nad / w / do, perfectivos, będzie, stoi / leży, cantidades con genitivo, właśnie.",
  "W sobotę pojadę pociągiem w góry, do Zakopanego. Będzie padać śnieg i będzie minus pięć stopni. Będę spać w małym pokoju: pod oknem stoi łóżko, a nad łóżkiem wisi obraz. Przed wyjazdem kupię ciepłą czapkę, kilo jabłek i butelkę wody. Teraz właśnie pakuję walizkę.",
  ["destino y transporte", "tiempo", "alojamiento", "compras", "qué haces ahora"],
  40,
  120,
  9,
);
console.log("review 7-9 saved", r.save(), "unit 9 (pl-es) total", renumber(9, { ...COURSE }));
