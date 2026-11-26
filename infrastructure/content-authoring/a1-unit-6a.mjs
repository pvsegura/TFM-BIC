// Spanish for Polish speakers — A1 unit 6A (¿Qué te gusta?) exercises.
//   node infrastructure/content-authoring/a1-unit-6a.mjs
import fs from "node:fs";

import { kit, planImages, renumber } from "./ex-kit.mjs";

// Older unit-6 exercises: put them in their proper PUENTE phase.
const EX = "c:/Users/usuario/TFM-BIC/content/languages/es/levels/a1/exercises/";
for (const [id, phase] of [
  ["es-u6-mucho", "structure"],
  ["es-u6-libre", "connect"],
  ["es-u6-quedar", "connect"],
]) {
  const file = `${EX}${id}.json`;
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/"phase": "\w+"/, `"phase": "${phase}"`),
  );
}

const a = kit(6, "es-unit-6-likes", 300);
// PERCIBIR — the intercambio dialogue
a.mc(
  "es-u6a-listen-dance",
  "perceive",
  "Dialog: co Ola uwielbia robić?",
  "Me encanta bailar. Voy a clases de salsa dos veces a la semana.",
  ["Tańczyć salsę.", "Biegać po plaży.", "Oglądać mecze."],
);
a.tf(
  "es-u6a-listen-novels",
  "perceive",
  "Dialog: Sofía też lubi czytać kryminały.",
  "Sofía odpowiada ¿Sí? A mí no. Prefiero las series.",
  false,
);
a.mc(
  "es-u6a-listen-football",
  "perceive",
  "Dialog: co Ola i Sofía myślą o piłce nożnej?",
  "Ola: no me gusta nada. Sofía: ¡A mí tampoco! Lubi ją tylko chłopak Sofíi.",
  ["Obie jej nie lubią.", "Obie ją uwielbiają.", "Ola ją lubi, Sofía nie."],
);
a.mc(
  "es-u6a-listen-saturday",
  "perceive",
  "Dialog: co robi Sofía w soboty o siódmej rano?",
  "Los sábados me levanto a las siete y voy a correr a la playa.",
  ["Biega na plaży.", "Śpi do południa.", "Idzie na lekcję salsy."],
);
a.tf(
  "es-u6a-listen-subtitles",
  "perceive",
  "Dialog: Ola ogląda hiszpańskie seriale z napisami po hiszpańsku.",
  "Las veo con subtítulos en español.",
  true,
);
// CONECTAR — free-time words
a.match(
  "es-u6a-match-hobbies",
  "connect",
  "Połącz czynności z tłumaczeniem.",
  "Pasear = spacerować; quedar con amigos = umawiać się / spotykać z przyjaciółmi.",
  [
    ["pasear", "spacerować"],
    ["nadar", "pływać"],
    ["dibujar", "rysować"],
    ["descansar", "odpoczywać"],
    ["hacer fotos", "robić zdjęcia"],
    ["ir a conciertos", "chodzić na koncerty"],
  ],
);
a.mc(
  "es-u6a-jugar-tocar",
  "connect",
  "Uzupełnij: Mi hermano ___ la guitarra y ___ al fútbol.",
  "Na instrumencie: tocar. W grę lub sport: jugar a (a + el = al).",
  ["toca / juega", "juega / toca", "toca / toca"],
);
a.mc(
  "es-u6a-madrugar",
  "connect",
  "Co znaczy madrugar?",
  "Madrugar = wstawać bardzo wcześnie (od madrugada, wczesny ranek).",
  ["Wstawać bardzo wcześnie.", "Kłaść się późno spać.", "Jeść śniadanie."],
);
a.match(
  "es-u6a-match-things",
  "connect",
  "Połącz rzeczy z tłumaczeniem.",
  "Las películas de miedo = horrory; la montaña = góry.",
  [
    ["las películas de miedo", "horrory"],
    ["la montaña", "góry"],
    ["las novelas policiacas", "kryminały"],
    ["el partido", "mecz"],
    ["los videojuegos", "gry wideo"],
  ],
);
// ESTRUCTURAR — gustar, encantar, reactions
a.gap(
  "es-u6a-gap-gusta-gustan",
  "structure",
  "Uzupełnij formą gusta albo gustan.",
  "Gusta: jedna rzecz albo czynność (nawet kilka czynności). Gustan: wiele rzeczy.",
  "Me ___ el cine, me ___ las películas de miedo y me ___ leer y cocinar.",
  [["gusta"], ["gustan"], ["gusta"]],
);
a.gap(
  "es-u6a-gap-pronouns",
  "structure",
  "Uzupełnij zaimkiem: me, te, le, nos, os, les.",
  "A ti → te; a nosotros → nos; a ellos → les.",
  "¿A ti ___ gusta el jazz? A nosotros ___ encanta viajar. A ellos no ___ gusta madrugar.",
  [["te"], ["nos"], ["les"]],
);
a.mc(
  "es-u6a-yo-gusto",
  "structure",
  "Które zdanie jest poprawne?",
  "Zaczynamy od zaimka, a czasownik zgadza się z rzeczą: me gusta el fútbol.",
  ["Me gusta el fútbol.", "Yo gusto el fútbol.", "Me gusto el fútbol."],
);
a.mc(
  "es-u6a-a-ti",
  "structure",
  "— Me encantan los gatos. — Ty też je uwielbiasz. Co mówisz?",
  "Przy gustar i encantar: a mí también.",
  ["¡A mí también!", "¡Yo también!", "¡A mí tampoco!"],
);
a.mc(
  "es-u6a-yo-tambien",
  "structure",
  "— Bailo salsa los jueves. — Ty też tańczysz. Co mówisz?",
  "Bailar to zwykły czasownik, więc odpowiadamy yo también.",
  ["Yo también.", "A mí también.", "Yo tampoco."],
);
a.mc(
  "es-u6a-a-mi-no",
  "structure",
  "— Me gusta mucho la playa. — Ty nie lubisz plaży. Co mówisz?",
  "Niezgoda z twierdzeniem: a mí no.",
  ["Pues a mí no.", "A mí tampoco.", "A mí sí."],
);
a.gap(
  "es-u6a-gap-reactions",
  "structure",
  "Uzupełnij reakcje: también, tampoco, sí, no.",
  "Ola nie lubi piłki — Sofía też nie (tampoco). Ola nie lubi wczesnego wstawania — Sofía lubi (sí).",
  "— No me gusta el fútbol. — A mí ___. — No me gusta madrugar. — Pues a mí ___.",
  [["tampoco"], ["sí"]],
);
a.gap(
  "es-u6a-gap-encantar",
  "structure",
  "Uzupełnij formą encantar.",
  "Encanta(n) zgadza się z rzeczą: el chocolate → encanta, las series → encantan.",
  "A mi hermana le ___ el chocolate y a mí me ___ las series de misterio.",
  [["encanta"], ["encantan"]],
);
a.mc(
  "es-u6a-prefiero",
  "structure",
  "Uzupełnij: — ¿Te gusta el té? — No mucho, ___ el café.",
  "Preferir to zwykły czasownik z wymianą e → ie: prefiero, prefieres, prefiere.",
  ["prefiero", "me prefiere", "prefero"],
);
a.order(
  "es-u6a-order-mother",
  "structure",
  "Ułóż zdanie: Moja mama bardzo lubi gotować.",
  "A + osoba + le gusta: podwójne wskazanie osoby jest normą.",
  ["A", "mi", "madre", "le", "gusta", "mucho", "cocinar."],
);
a.order(
  "es-u6a-order-question",
  "structure",
  "Ułóż pytanie: Co lubicie robić w weekendy?",
  "Vosotros → os gusta.",
  ["¿Qué", "os", "gusta", "hacer", "los", "fines", "de", "semana?"],
);
// SONAR — the letter g
a.match(
  "es-u6a-sound-g",
  "sound",
  "Połącz słowo z wymową litery g.",
  "G przed e, i brzmi jak hiszpańska j (polskie ch); gu przed e, i to [g] z niemym u.",
  [
    ["gente", "[ch] jak w „chata”"],
    ["guitarra", "[g], u jest nieme"],
    ["gato", "[g] jak w „gata”"],
    ["pingüino", "[gu], u słychać"],
  ],
);
a.tf(
  "es-u6a-sound-guerra",
  "sound",
  "W słowie guerra (wojna) słychać u: [guera].",
  "Nie: gu przed e jest jak polskie g — [gera]. U słychać tylko z dwiema kropkami (ü).",
  false,
);
a.mc(
  "es-u6a-sound-gimnasio",
  "sound",
  "Jak brzmi g w słowie gimnasio?",
  "Przed i: jak hiszpańska j — [chimnasio].",
  ["Jak polskie ch: [chimnasio].", "Jak polskie g: [gimnasio].", "Jak polskie dż: [dżimnasio]."],
);
// CULTURA — reading and culture
a.mc(
  "es-u6a-reading-padel",
  "culture",
  "Lectura: z kim Javier gra w padla w soboty?",
  "Juega al pádel con dos compañeros de trabajo y su hermano.",
  ["Z dwoma kolegami z pracy i bratem.", "Z rodzicami.", "Sam, na plaży."],
);
a.tf(
  "es-u6a-reading-olives",
  "culture",
  "Lectura: Javier uwielbia oliwki.",
  "No le gustan nada las aceitunas — w ogóle ich nie lubi; uwielbia tapas z rybą.",
  false,
);
a.mc(
  "es-u6a-reading-sunday",
  "culture",
  "Lectura: co Javier robi w niedzielę po obiedzie?",
  "Su madre y él dan un paseo por el río; ojciec ogląda mecz.",
  ["Spaceruje z mamą nad rzeką.", "Ogląda mecz z ojcem.", "Gra w padla z bratem."],
);
a.mc(
  "es-u6a-culture-quedar",
  "culture",
  "Kultura: gdzie Hiszpanie najczęściej spotykają się ze znajomymi?",
  "Spotkania odbywają się zwykle na mieście — w barach, na placach, przy tapas.",
  [
    "Na mieście: w barach i na placach.",
    "Prawie zawsze w domu.",
    "Tylko w weekendy w restauracjach hotelowych.",
  ],
);
a.tf(
  "es-u6a-culture-clasico",
  "culture",
  "Kultura: el clásico to mecz Realu Madryt z FC Barceloną.",
  "Tak — największe sportowe wydarzenie w Hiszpanii.",
  true,
);
// TRANSFORMAR — translations
a.ta(
  "es-u6a-translate-love",
  "transform",
  "Napisz po hiszpańsku: Uwielbiam czekoladę.",
  "Encantar bez mucho: me encanta + rzecz z rodzajnikiem.",
  ["Me encanta el chocolate.", "A mí me encanta el chocolate."],
);
a.ta(
  "es-u6a-translate-parents",
  "transform",
  "Napisz po hiszpańsku: Moi rodzice lubią spacerować.",
  "A + osoby + les gusta + bezokolicznik.",
  ["A mis padres les gusta pasear."],
);
a.ta(
  "es-u6a-translate-me-neither",
  "transform",
  "Odpowiedz po hiszpańsku, że ty też nie: — No me gustan los lunes.",
  "Zgoda z przeczeniem: a mí tampoco.",
  ["A mí tampoco.", "A mí tampoco me gustan.", "¡A mí tampoco!"],
);
a.ta(
  "es-u6a-translate-guitar",
  "transform",
  "Napisz po hiszpańsku: Gram na gitarze, ale nie gram w piłkę.",
  "Tocar (instrument) i jugar a (gra): no juego al fútbol.",
  ["Toco la guitarra, pero no juego al fútbol.", "Toco la guitarra pero no juego al fútbol."],
);
a.ta(
  "es-u6a-translate-what",
  "transform",
  "Napisz po hiszpańsku: Co lubisz robić w wolnym czasie?",
  "¿Qué te gusta hacer…? + en tu tiempo libre.",
  ["¿Qué te gusta hacer en tu tiempo libre?", "¿Qué te gusta hacer en el tiempo libre?"],
);
// EXPRESAR — writing
a.write(
  "es-u6a-write-profile",
  "express",
  "Napisz swój profil na stronę wymiany językowej (intercambio): kim jesteś, co lubisz, co uwielbiasz, czego nie lubisz i czego szukasz.",
  "Sprawdź: gusta / gustan zgodnie z rzeczą, encanta bez mucho, rodzajniki przed rzeczownikami.",
  "¡Hola! Me llamo Kasia y soy de Gdańsk. Tengo veintiocho años. En mi tiempo libre me gusta leer, cocinar y pasear por la playa. Me encantan los perros y las series españolas. No me gusta nada madrugar los fines de semana. Busco un intercambio para hablar español los jueves por la tarde.",
  [
    "przedstawienie się",
    "trzy rzeczy, które lubisz",
    "me encanta / me encantan",
    "no me gusta nada",
    "czego szukasz",
  ],
  35,
  110,
  8,
);
a.write(
  "es-u6a-write-reply",
  "express",
  "Odpowiedz na wiadomość: «Me encanta el cine, pero no me gusta nada el fútbol. ¿Y a ti?» Zareaguj na obie rzeczy i dodaj dwie swoje.",
  "Użyj a mí también / a mí tampoco / a mí sí / a mí no i jednego pytania.",
  "¡Hola, Marta! A mí también me encanta el cine, sobre todo las películas de miedo. Pues a mí sí me gusta el fútbol: veo los partidos con mi hermano. También me gusta mucho nadar. ¿Te gusta la montaña?",
  ["reakcja na kino", "reakcja na piłkę", "dwie twoje rzeczy", "pytanie"],
  25,
  80,
  6,
);
console.log("6A", a.save(), "unit 6 total", renumber(6));

planImages([
  {
    asset: "a1-u6-intercambio.png",
    prompt:
      "two young women talking and laughing at a small cafe table, cups of coffee and open notebooks in front of them, warm afternoon light",
  },
]);
