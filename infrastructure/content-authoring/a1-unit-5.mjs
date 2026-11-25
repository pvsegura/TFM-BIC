// Unit 5 workbook exercises (5A my day, 5B the week) and illustrations.
//   node infrastructure/content-authoring/a1-unit-5.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const a = kit(5, "es-unit-5-my-day", 300);
a.mc(
  "es-u5a-listen-wake",
  "perceive",
  "Wywiad: o której wstaje Paweł?",
  "Me levanto a las seis y media.",
  ["O 6:30.", "O 7:30.", "O 6:00."],
);
a.tf(
  "es-u5a-listen-lunch",
  "perceive",
  "Wywiad: Paweł zwykle je obiad w domu.",
  "Normalmente como en la oficina con mis compañeros.",
  false,
);
a.mc(
  "es-u5a-listen-never",
  "perceive",
  "Wywiad: czego Paweł nigdy nie robi?",
  "¡Nunca veo la tele!",
  ["Nie ogląda telewizji.", "Nie je kolacji.", "Nie chodzi na siłownię."],
);
a.match(
  "es-u5a-match-routine",
  "connect",
  "Połącz czynności z tłumaczeniem.",
  "Despertarse = budzić się; acostarse = kłaść się spać.",
  [
    ["despertarse", "budzić się"],
    ["vestirse", "ubierać się"],
    ["volver a casa", "wracać do domu"],
    ["acostarse", "kłaść się spać"],
    ["cenar", "jeść kolację"],
  ],
);
a.match(
  "es-u5a-match-time",
  "connect",
  "Połącz godziny.",
  "Menos cuarto = za piętnaście; y media = wpół do następnej.",
  [
    ["Son las siete y media.", "7:30"],
    ["Son las ocho menos cuarto.", "7:45"],
    ["Es la una y diez.", "1:10"],
    ["Son las tres y cuarto.", "3:15"],
  ],
);
a.gap(
  "es-u5a-gap-reflexive",
  "structure",
  "Uzupełnij zaimki zwrotne.",
  "Yo me levanto, tú te duchas, nosotros nos acostamos.",
  "Yo ___ levanto, tú ___ duchas y nosotros ___ acostamos tarde.",
  [["me"], ["te"], ["nos"]],
);
a.mc(
  "es-u5a-acostarse",
  "structure",
  "Uzupełnij: Mis hijos ___ a las nueve.",
  "Acostarse o → ue: ellos se acuestan.",
  ["se acuestan", "se acostan", "acuestan"],
);
a.mc(
  "es-u5a-es-son",
  "structure",
  "Która godzina? 1:20",
  "Pierwsza godzina w liczbie pojedynczej: Es la una y veinte.",
  ["Es la una y veinte.", "Son la una y veinte.", "Son las uno y veinte."],
);
a.mc(
  "es-u5a-nunca",
  "structure",
  "Wybierz poprawne zdanie: Nigdy nie piję kawy.",
  "Nunca przed czasownikiem — bez no; po czasowniku — z no.",
  ["Nunca bebo café.", "Nunca no bebo café.", "Bebo nunca café."],
);
a.order(
  "es-u5a-order-sequence",
  "structure",
  "Ułóż zdanie: Najpierw jem śniadanie, a potem biorę prysznic.",
  "Primero…, luego…; ducharse: me ducho.",
  ["Primero", "desayuno", "y", "luego", "me", "ducho."],
);
a.tf(
  "es-u5a-sound-diphthong",
  "sound",
  "W me despierto „ie” wymawiamy jako dwie osobne sylaby: [des-pi-er-to].",
  "Ie to dyftong — jedna sylaba: [des-PJER-to].",
  false,
);
a.mc(
  "es-u5a-reading-carmen",
  "culture",
  "Czytanka: do której pracuje Carmen w tym tygodniu?",
  "Trabaja de siete a tres.",
  ["Do 15:00.", "Do 19:00.", "Do 22:00."],
);
a.tf(
  "es-u5a-reading-friday",
  "culture",
  "Czytanka: w piątki Carmen wychodzi z koleżankami i wraca późno.",
  "Los viernes sale con sus amigas y vuelve muy tarde.",
  true,
);
a.ta(
  "es-u5a-translate-time",
  "transform",
  "Napisz po hiszpańsku: O której wstajesz?",
  "¿A qué hora…? + te levantas.",
  ["¿A qué hora te levantas?", "A qué hora te levantas"],
);
a.ta(
  "es-u5a-translate-gym",
  "transform",
  "Napisz po hiszpańsku: Czasami chodzę na siłownię.",
  "A veces + ir al gimnasio.",
  ["A veces voy al gimnasio.", "Voy al gimnasio a veces."],
);
a.write(
  "es-u5a-write-day",
  "express",
  "Opisz swój zwykły dzień w 6–8 zdaniach: godziny, czasowniki zwrotne, kolejność i częstotliwość.",
  "Sprawdź zaimki zwrotne, a las + godzina i miejsce nunca.",
  "Me despierto a las siete menos cuarto y me levanto a las siete. Primero me ducho y luego desayuno. Salgo de casa a las ocho y voy a la oficina en autobús. Como a las dos. Termino de trabajar a las cinco. Normalmente ceno a las ocho y me acuesto a las once. Nunca trabajo los domingos.",
  [
    "co najmniej trzy czasowniki zwrotne",
    "godziny z a las",
    "primero / luego / después",
    "słowo częstotliwości",
  ],
  35,
  120,
  8,
);
console.log("5A", a.save());

const b = kit(5, "es-unit-5-week", 300);
b.mc(
  "es-u5b-listen-shopping",
  "perceive",
  "Dialog: kiedy Javier robi zakupy?",
  "Yo la hago el martes.",
  ["We wtorek.", "W poniedziałek.", "W czwartek."],
);
b.tf(
  "es-u5b-listen-class",
  "perceive",
  "Dialog: zajęcia z angielskiego Oli kończą się o siódmej.",
  "La clase termina a las siete.",
  true,
);
b.mc(
  "es-u5b-listen-sunday",
  "perceive",
  "Dialog: co Javier robi w niedzielę?",
  "El domingo siempre hago deporte. Salgo a correr al parque.",
  ["Biega w parku.", "Śpi do dziesiątej.", "Idzie na targ."],
);
b.match(
  "es-u5b-match-days",
  "connect",
  "Połącz dni tygodnia.",
  "Miércoles = środa, jueves = czwartek, viernes = piątek.",
  [
    ["el miércoles", "środa"],
    ["el jueves", "czwartek"],
    ["el viernes", "piątek"],
    ["el martes", "wtorek"],
    ["el domingo", "niedziela"],
  ],
);
b.match(
  "es-u5b-match-chores",
  "connect",
  "Połącz obowiązki domowe.",
  "Fregar los platos = zmywać; sacar la basura = wynosić śmieci.",
  [
    ["fregar los platos", "zmywać naczynia"],
    ["sacar la basura", "wynosić śmieci"],
    ["poner la lavadora", "nastawić pranie"],
    ["hacer la cama", "ścielić łóżko"],
  ],
);
b.mc(
  "es-u5b-los-lunes",
  "structure",
  "Uzupełnij: ___ lunes voy a clase de yoga (co tydzień).",
  "Regularnie: los lunes, bez przyimka.",
  ["Los", "En", "El en"],
);
b.gap(
  "es-u5b-gap-tener-que",
  "structure",
  "Uzupełnij: Musimy sprzątać dom w sobotę.",
  "Tener que + bezokolicznik: nosotros tenemos que limpiar.",
  "___ que ___ la casa el sábado.",
  [["tenemos"], ["limpiar"]],
);
b.mc("es-u5b-hago", "structure", "Uzupełnij: Yo ___ la compra los martes.", "Hacer: yo hago.", [
  "hago",
  "hace",
  "haco",
]);
b.mc(
  "es-u5b-salgo",
  "structure",
  "Uzupełnij: Los viernes ___ con mis amigos.",
  "Salir: yo salgo.",
  ["salgo", "salo", "sale"],
);
b.mc(
  "es-u5b-saber",
  "structure",
  "Uzupełnij: No ___ cocinar muy bien.",
  "Saber: yo sé (z kreską).",
  ["sé", "sabo", "se"],
);
b.mc(
  "es-u5b-dormir",
  "structure",
  "Uzupełnij: Los domingos mi hermano ___ hasta las doce.",
  "Dormir o → ue: él duerme.",
  ["duerme", "dorme", "duermo"],
);
b.order(
  "es-u5b-order-weekend",
  "structure",
  "Ułóż pytanie: Co robisz w weekend?",
  "¿Qué haces + el fin de semana?",
  ["¿Qué", "haces", "el", "fin", "de", "semana?"],
);
b.tf(
  "es-u5b-sound-bv",
  "sound",
  "W hiszpańskim b i v wymawia się tak samo.",
  "Tak — dlatego mówi się be de Barcelona / uve de Valencia.",
  true,
);
b.mc(
  "es-u5b-reading-market",
  "culture",
  "Czytanka: co Javier kupuje w sobotę na targu?",
  "Compra fruta y pescado.",
  ["Owoce i rybę.", "Chleb i ser.", "Mięso i wino."],
);
b.tf(
  "es-u5b-reading-puente",
  "culture",
  "Czytanka i kultura: „puente” to dodatkowy dzień wolny między świętem a weekendem.",
  "Los puentes — długie weekendy.",
  true,
);
b.ta(
  "es-u5b-translate-must",
  "transform",
  "Napisz po hiszpańsku: Muszę pracować w sobotę.",
  "Tener que + trabajar; el sábado.",
  ["Tengo que trabajar el sábado.", "El sábado tengo que trabajar."],
);
b.ta(
  "es-u5b-translate-sundays",
  "transform",
  "Napisz po hiszpańsku: W niedziele śpię do dziesiątej.",
  "Los domingos + duermo.",
  ["Los domingos duermo hasta las diez."],
);
b.write(
  "es-u5b-write-week",
  "express",
  "Napisz wiadomość do nowego współlokatora: twój tydzień, obowiązki domowe i plany na weekend.",
  "Sprawdź los + dzień, tener que i formy hago/salgo/pongo.",
  "Hola, Marta. Los lunes y los miércoles trabajo hasta las siete. Los martes hago la compra y los jueves pongo la lavadora. Tú tienes que sacar la basura y fregar los platos. El sábado salgo con mis amigos y el domingo duermo hasta tarde.",
  [
    "dni tygodnia z los / el",
    "tener que",
    "co najmniej dwa czasowniki z nieregularnym yo",
    "plan na weekend",
  ],
  30,
  110,
  8,
);
console.log("5B", b.save(), "unit 5 total", renumber(5));

planImages([
  {
    asset: "a1-u5-morning.png",
    prompt:
      "a man in a small kitchen in the morning drinking coffee and looking at his wristwatch, an alarm clock and toast on the table, sunlight through the window",
  },
  {
    asset: "a1-u5-roommates.png",
    prompt:
      "two young roommates in a shared kitchen planning the week next to a blank wall calendar on the fridge, one holds a shopping bag, the other a mop",
  },
]);
