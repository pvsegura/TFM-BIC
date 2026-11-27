// Spanish for Polish speakers — A1 unit 9A (¿Qué tiempo va a hacer?) exercises.
//   node infrastructure/content-authoring/a1-unit-9a.mjs
import fs from "node:fs";

import { kit, planImages, renumber } from "./ex-kit.mjs";

// Older unit-9 exercises: put them in their proper PUENTE phase.
const EX = "c:/Users/usuario/TFM-BIC/content/languages/es/levels/a1/exercises/";
for (const [id, phase] of [
  ["es-u9-months-tf", "connect"],
  ["es-u9-fin-semana", "connect"],
  ["es-u9-llueve", "connect"],
  ["es-u9-nublado", "connect"],
  ["es-u9-primavera", "connect"],
  ["es-u9-verano", "connect"],
]) {
  const file = `${EX}${id}.json`;
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/"phase": "\w+"/, `"phase": "${phase}"`),
  );
}

const a = kit(9, "es-unit-9-weather", 300);
// PERCIBIR
a.mc(
  "es-u9a-listen-saturday",
  "perceive",
  "Dialog: jaka będzie pogoda w sobotę?",
  "El sábado va a llover.",
  ["Będzie padać.", "Będzie słonecznie.", "Będzie padał śnieg."],
);
a.mc(
  "es-u9a-listen-sunday",
  "perceive",
  "Dialog: jaka będzie pogoda w niedzielę?",
  "Va a hacer sol, pero también va a hacer viento; veinte grados.",
  ["Słońce, wiatr i 20 stopni.", "Deszcz i 12 stopni.", "Mgła i 5 stopni."],
);
a.tf(
  "es-u9a-listen-warsaw",
  "perceive",
  "Dialog: w Warszawie jest dziś ciepło.",
  "En Varsovia hoy están a dos grados bajo cero y nieva.",
  false,
);
a.mc(
  "es-u9a-listen-plan",
  "perceive",
  "Dialog: co robią w niedzielę?",
  "El domingo vamos a la montaña a hacer senderismo.",
  ["Idą w góry na wędrówkę.", "Jadą na plażę.", "Idą do muzeum."],
);
a.mc(
  "es-u9a-listen-take",
  "perceive",
  "Dialog: co Ola ma zabrać w góry?",
  "Lleva un jersey y un chubasquero, por si acaso.",
  ["Sweter i kurtkę przeciwdeszczową.", "Krem z filtrem.", "Rękawiczki i czapkę."],
);
// CONECTAR
a.match(
  "es-u9a-match-weather",
  "connect",
  "Połącz wyrażenia z tłumaczeniem.",
  "Hay niebla = jest mgła; hay tormenta = jest burza; está despejado = bezchmurnie.",
  [
    ["hay niebla", "jest mgła"],
    ["hay tormenta", "jest burza"],
    ["está despejado", "jest bezchmurnie"],
    ["hace viento", "wieje wiatr"],
    ["nieva", "pada śnieg"],
    ["hace mal tiempo", "jest brzydka pogoda"],
  ],
);
a.mc(
  "es-u9a-paraguas",
  "connect",
  "Pada deszcz. Czego potrzebujesz?",
  "Paraguas = parasol od deszczu (para + aguas).",
  ["Un paraguas.", "Una crema solar.", "Unas gafas de sol."],
);
a.mc(
  "es-u9a-parasol",
  "connect",
  "Co znaczy po hiszpańsku el parasol?",
  "Parasol (hiszp.) = parasol od słońca, np. na plaży; od deszczu: paraguas.",
  ["Parasol od słońca.", "Parasol od deszczu.", "Kurtka przeciwdeszczowa."],
);
a.match(
  "es-u9a-match-time",
  "connect",
  "Połącz wyrażenia czasu.",
  "Pasado mañana = pojutrze; la semana que viene = w przyszłym tygodniu.",
  [
    ["pasado mañana", "pojutrze"],
    ["la semana que viene", "w przyszłym tygodniu"],
    ["el año que viene", "w przyszłym roku"],
    ["este verano", "tego lata"],
  ],
);
// ESTRUCTURAR
a.gap(
  "es-u9a-gap-hace-esta-hay",
  "structure",
  "Uzupełnij hace, está albo hay.",
  "Hace + calor / sol; está + nublado; hay + niebla.",
  "Hoy ___ calor, pero ___ nublado y por la mañana ___ niebla.",
  [["hace"], ["está"], ["hay"]],
);
a.mc(
  "es-u9a-mucho-calor",
  "structure",
  "Które zdanie jest poprawne?",
  "Calor to rzeczownik: mucho calor.",
  ["Hace mucho calor.", "Hace muy calor.", "Es mucho calor."],
);
a.mc(
  "es-u9a-tengo-calor",
  "structure",
  "Jest ci gorąco w autobusie. Co mówisz?",
  "Osoba czuje: tengo calor.",
  ["Tengo calor.", "Hace calor yo.", "Estoy caliente."],
);
a.mc("es-u9a-sopa", "structure", "Uzupełnij: La sopa ___ fría.", "Rzecz w dotyku: estar.", [
  "está",
  "hace",
  "tiene",
]);
a.gap(
  "es-u9a-gap-llover",
  "structure",
  "Uzupełnij llueve / nieva.",
  "Llover → llueve; nevar → nieva.",
  "En Galicia ___ mucho y en los Pirineos en invierno ___.",
  [["llueve"], ["nieva"]],
);
a.mc(
  "es-u9a-grados",
  "structure",
  "Jak powiesz „Jest pięć stopni mrozu”?",
  "Estamos a / hay + grados bajo cero.",
  [
    "Estamos a cinco grados bajo cero.",
    "Hace cinco grados de frío bajo.",
    "Es cinco grados bajo cero.",
  ],
);
a.gap(
  "es-u9a-gap-ir-a",
  "structure",
  "Uzupełnij formą ir.",
  "Yo voy, tú vas, nosotros vamos, ellos van.",
  "Mañana yo ___ a estudiar, tú ___ a trabajar y nosotros ___ a cenar juntos.",
  [["voy"], ["vas"], ["vamos"]],
);
a.mc("es-u9a-va-a-llover", "structure", "Które zdanie jest poprawne?", "Ir + a + bezokolicznik.", [
  "Mañana va a llover.",
  "Mañana va llover.",
  "Mañana va a llueve.",
]);
a.mc(
  "es-u9a-van-a",
  "structure",
  "Uzupełnij: Mis padres ___ viajar a España en verano.",
  "Ellos → van a.",
  ["van a", "va a", "van"],
);
a.order(
  "es-u9a-order-plan",
  "structure",
  "Ułóż: W ten weekend pojedziemy w góry.",
  "Este fin de semana + vamos a ir + a la montaña.",
  ["Este fin de semana", "vamos", "a ir", "a la montaña."],
);
a.order(
  "es-u9a-order-weather",
  "structure",
  "Ułóż: Jest pochmurno i będzie padać.",
  "Está nublado y va a llover.",
  ["Está", "nublado", "y", "va", "a", "llover."],
);
// SONAR
a.mc(
  "es-u9a-sound-seseo",
  "sound",
  "Jak w Sewilli często brzmi hace sol?",
  "Seseo: c przed e jak s — [ase sol].",
  ["[ase sol]", "[aθe sol]", "[ake sol]"],
);
a.tf(
  "es-u9a-sound-s",
  "sound",
  "W Andaluzji s na końcu sylaby często słabnie do lekkiego wydechu: [doh grao].",
  "Tak: to typowa cecha akcentu południowego.",
  true,
);
a.mc(
  "es-u9a-sound-madrid",
  "sound",
  "Jak w Madrycie wymawia się z w słowie azul?",
  "Na północy i w centrum: jak angielskie th — [aθul].",
  ["Jak angielskie th.", "Jak polskie z.", "Jak polskie s."],
);
// CULTURA
a.mc(
  "es-u9a-reading-north",
  "culture",
  "Lectura: jaka będzie pogoda na północy (Galicja, Asturia)?",
  "Va a llover mucho; doce grados.",
  ["Dużo deszczu i 12 stopni.", "Słońce i 24 stopnie.", "Śnieg i mróz."],
);
a.mc(
  "es-u9a-reading-madrid",
  "culture",
  "Lectura: jaka temperatura będzie w Madrycie o siódmej rano?",
  "Dos grados bajo cero a las siete.",
  ["−2 stopnie.", "15 stopni.", "2 stopnie."],
);
a.tf(
  "es-u9a-reading-canarias",
  "culture",
  "Lectura: na Wyspach Kanaryjskich będzie padać.",
  "Como siempre, va a hacer buen tiempo: veinticuatro grados y sol.",
  false,
);
a.mc(
  "es-u9a-culture-north",
  "culture",
  "Kultura: która część Hiszpanii jest deszczowa i zielona?",
  "Północ: Galicja, Asturia, Kraj Basków.",
  ["Północ (Galicja, Asturia).", "Andaluzja.", "Wyspy Kanaryjskie."],
);
// TRANSFORMAR
a.ta(
  "es-u9a-translate-cold",
  "transform",
  "Napisz po hiszpańsku: Dziś jest bardzo zimno.",
  "Hoy hace mucho frío.",
  ["Hoy hace mucho frío.", "Hace mucho frío hoy."],
);
a.ta(
  "es-u9a-translate-feel-cold",
  "transform",
  "Napisz po hiszpańsku: Jest mi zimno.",
  "Tengo frío.",
  ["Tengo frío.", "Yo tengo frío."],
);
a.ta(
  "es-u9a-translate-snow",
  "transform",
  "Napisz po hiszpańsku: Jutro będzie padał śnieg.",
  "Mañana va a nevar.",
  ["Mañana va a nevar."],
);
a.ta(
  "es-u9a-translate-degrees",
  "transform",
  "Napisz po hiszpańsku: Jest dwadzieścia pięć stopni.",
  "Estamos a / hay veinticinco grados.",
  ["Estamos a veinticinco grados.", "Hay veinticinco grados."],
);
a.ta(
  "es-u9a-translate-travel",
  "transform",
  "Napisz po hiszpańsku: Tego lata pojadę do Hiszpanii.",
  "Este verano voy a viajar / ir a España.",
  ["Este verano voy a ir a España.", "Este verano voy a viajar a España."],
);
// EXPRESAR
a.write(
  "es-u9a-write-forecast",
  "express",
  "Napisz prognozę pogody na weekend dla swojego miasta i krótki plan: co będziesz robić w sobotę i w niedzielę, zależnie od pogody.",
  "Sprawdź: hace / está / hay, va a + bezokolicznik, stopnie, mucho calor / frío.",
  "Este fin de semana en Cracovia va a hacer mucho frío. El sábado va a estar nublado y va a nevar por la tarde: vamos a estar a tres grados bajo cero. El domingo va a hacer sol. El sábado voy a ver una película en casa con mi hermana y el domingo vamos a pasear por el parque.",
  ["prognoza na sobotę", "prognoza na niedzielę", "temperatura", "plany z ir a"],
  35,
  110,
  8,
);
a.write(
  "es-u9a-write-seasons",
  "express",
  "Napisz do znajomego z Hiszpanii, jaka jest pogoda w Polsce w różnych porach roku i którą porę roku lubisz najbardziej.",
  "En invierno hace…, en verano…; prefiero…; me encanta…",
  "En Polonia en invierno hace mucho frío y a veces nieva. En primavera llueve y hace un poco de frío. En verano hace calor, pero no tanto como en España. En otoño hay niebla y hace viento. Prefiero el verano porque me encanta nadar en el lago.",
  ["cztery pory roku", "ulubiona pora roku"],
  25,
  80,
  6,
);
console.log("9A", a.save(), "unit 9 total", renumber(9));

planImages([
  {
    asset: "a1-u9-forecast.png",
    prompt:
      "two young women sitting on a sofa look together at a smartphone and plan a trip, sunshine through the window, a backpack and a rain jacket on the coffee table, no maps, no text on the phone",
  },
]);
