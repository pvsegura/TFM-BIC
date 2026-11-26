// Polish for Spanish speakers — A1 unit 1A exercises (explained in Spanish).
//   node infrastructure/content-authoring/pl-es-a1-unit-1a.mjs
import { kit, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(1, "pl-es-unit-1-hello", 1000, COURSE);
k.mc(
  "pl-es-u1a-listen-why",
  "perceive",
  "Diálogo en la recepción: ¿para qué va Javier a la escuela?",
  "Chcę zapisać się na kurs polskiego — quiero apuntarme al curso de polaco.",
  [
    "Para apuntarse a un curso de polaco.",
    "Para buscar trabajo de profesor.",
    "Para preguntar por un hotel.",
  ],
);
k.tf(
  "pl-es-u1a-listen-formal",
  "perceive",
  "Diálogo: la recepcionista tutea a Javier.",
  "Le dice Jak się pan nazywa? — trato formal (pan).",
  false,
);
k.mc(
  "pl-es-u1a-listen-email",
  "perceive",
  "Diálogo: ¿qué significa małpa en el correo de Javier?",
  "En polaco la arroba se llama małpa («mona»).",
  ["La arroba (@).", "El punto.", "El guion."],
);
k.match(
  "pl-es-u1a-match-greetings",
  "connect",
  "Une cada expresión con su traducción.",
  "Cześć sirve para saludar y despedirse entre amigos; Dobranoc solo al irse a dormir.",
  [
    ["Cześć!", "¡Hola! / ¡Adiós!"],
    ["Dzień dobry.", "Buenos días."],
    ["Do widzenia.", "Adiós (formal)."],
    ["Dobranoc.", "Buenas noches (al dormir)."],
    ["Dziękuję.", "Gracias."],
  ],
);
k.match(
  "pl-es-u1a-match-words",
  "connect",
  "Une las palabras.",
  "Imię = nombre; nazwisko = apellido.",
  [
    ["imię", "nombre"],
    ["nazwisko", "apellido"],
    ["Przepraszam.", "Perdón."],
    ["Miło mi.", "Encantado/a."],
  ],
);
k.gap(
  "pl-es-u1a-gap-byc",
  "structure",
  "Completa con las formas de być.",
  "Ja jestem, ty jesteś, my jesteśmy.",
  "Ja ___ Ana, ty ___ Tomek, a my ___ w Krakowie.",
  [["jestem"], ["jesteś"], ["jesteśmy"]],
);
k.gap(
  "pl-es-u1a-gap-miec",
  "structure",
  "Completa con mieć: ¿Cómo te llamas? — Me llamo Lucía.",
  "Ty masz, ja mam: Jak masz na imię? — Mam na imię…",
  "Jak ___ na imię? — ___ na imię Lucía.",
  [["masz"], ["mam"]],
);
k.mc(
  "pl-es-u1a-formal",
  "structure",
  "Preguntas el nombre a una señora mayor. ¿Qué dices?",
  "Trato formal: pani + verbo en tercera persona.",
  ["Jak się pani nazywa?", "Jak masz na imię?", "Jak się nazywasz?"],
);
k.mc(
  "pl-es-u1a-pronoun-oni",
  "structure",
  "Hablas de Ana y Tomek (una mujer y un hombre). ¿Qué pronombre usas?",
  "Oni: grupo con al menos un hombre; one: sin hombres.",
  ["oni", "one", "ono"],
);
k.mc(
  "pl-es-u1a-sa",
  "structure",
  "Completa: Oni ___ z Hiszpanii.",
  "Być, tercera persona del plural: są.",
  ["są", "jest", "jesteście"],
);
k.order(
  "pl-es-u1a-order-name",
  "structure",
  "Ordena: Me llamo Javier y soy de España.",
  "Mam na imię…; jestem z + país.",
  ["Mam", "na", "imię", "Javier", "i", "jestem", "z", "Hiszpanii."],
);
k.tf(
  "pl-es-u1a-sound-l",
  "sound",
  "La letra ł se pronuncia como la l española.",
  "No: ł suena como la w inglesa de «water» — ładny [uadny].",
  false,
);
k.mc(
  "pl-es-u1a-sound-stress",
  "sound",
  "¿Dónde cae el acento en Warszawa?",
  "En polaco el acento cae casi siempre en la penúltima sílaba: War-SZA-wa.",
  [
    "En la penúltima sílaba: War-SZA-wa.",
    "En la última: War-sza-WA.",
    "En la primera: WAR-sza-wa.",
  ],
);
k.match(
  "pl-es-u1a-match-sounds",
  "sound",
  "Une cada grafía con su sonido aproximado.",
  "Cz = ch española; sz = sh; ch = j española; c = ts.",
  [
    ["cz", "ch española (czas)"],
    ["sz", "sh inglesa (szkoła)"],
    ["ch", "j española (chleb)"],
    ["c", "ts (co)"],
  ],
);
k.mc(
  "pl-es-u1a-reading-kasia",
  "culture",
  "Lectura: ¿cómo llaman a Katarzyna sus amigos?",
  "Wszyscy mówią do mnie Kasia — el diminutivo.",
  ["Kasia", "Kaśka", "Katia"],
);
k.tf(
  "pl-es-u1a-reading-namedays",
  "culture",
  "Lectura y cultura: en Polonia los imieniny (el santo) son importantes.",
  "W Polsce ważne są imieniny.",
  true,
);
k.ta(
  "pl-es-u1a-translate-name",
  "transform",
  "Escribe en polaco: Me llamo Ana. Encantada.",
  "Mam na imię…; miło mi es igual para hombre y mujer.",
  ["Mam na imię Ana. Miło mi.", "Mam na imię Ana, miło mi.", "Nazywam się Ana. Miło mi."],
);
k.ta(
  "pl-es-u1a-translate-thanks",
  "transform",
  "Escribe en polaco: Perdón, ¿cómo se escribe?",
  "Przepraszam + jak się pisze?",
  ["Przepraszam, jak się pisze?", "Przepraszam, jak to się pisze?"],
);
k.ta(
  "pl-es-u1a-translate-formal",
  "transform",
  "Escribe en polaco: ¿Cómo se llama usted? (a un hombre)",
  "Pan + nazywa się.",
  ["Jak się pan nazywa?", "Jak pan się nazywa?"],
);
k.write(
  "pl-es-u1a-write-enrol",
  "express",
  "Escribe un breve mensaje en polaco a la recepción de tu hotel en Cracovia: saluda, di que tienes una reserva, deletrea tu apellido y da tu correo.",
  "Revisa: Dzień dobry, nazywam się…, los nombres de las letras y małpa / kropka.",
  "Dzień dobry. Mam rezerwację. Nazywam się Ana García. Moje nazwisko pisze się: gie, a, er, ce, i, a. Mój e-mail to ana kropka garcia małpa poczta kropka es. Dziękuję.",
  [
    "saludo formal",
    "mam rezerwację",
    "nazywam się / mam na imię",
    "apellido deletreado",
    "correo con małpa y kropka",
  ],
  15,
  70,
  6,
);
console.log("saved", k.save(), "unit 1 (pl-es) total", renumber(1, { ...COURSE }));
