// Polish for Spanish speakers — A1 unit 5A (Mój dzień) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-5a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(5, "pl-es-unit-5-my-day", 5100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u5a-listen-javier-up",
  "perceive",
  "Diálogo: ¿a qué hora se levanta Javier?",
  "Codziennie wstaję o szóstej.",
  ["A las seis.", "A las siete y media.", "A las ocho."],
);
k.mc(
  "pl-es-u5a-listen-why",
  "perceive",
  "Diálogo: ¿por qué se levanta tan temprano?",
  "Rano biegam w parku.",
  [
    "Porque corre en el parque.",
    "Porque empieza a trabajar a las seis.",
    "Porque lleva a su sobrino al colegio.",
  ],
);
k.mc(
  "pl-es-u5a-listen-kasia-up",
  "perceive",
  "Diálogo: ¿a qué hora se levanta Kasia?",
  "Wstaję o wpół do ósmej = a las 7:30.",
  ["A las 7:30.", "A las 8:30.", "A las 6:00."],
);
k.tf(
  "pl-es-u5a-listen-breakfast",
  "perceive",
  "Diálogo: Kasia siempre desayuna en casa.",
  "Nigdy nie jem śniadania w domu — compra un bocadillo por el camino.",
  false,
);
k.mc(
  "pl-es-u5a-listen-obiad",
  "perceive",
  "Diálogo: ¿a qué hora hace Kasia la comida principal?",
  "Prawdziwy obiad jem w domu, o piątej.",
  ["A las cinco, en casa.", "A las doce, en el trabajo.", "A las tres, en un restaurante."],
);
k.mc(
  "pl-es-u5a-listen-bed",
  "perceive",
  "Diálogo: ¿a qué hora se acuesta Javier normalmente?",
  "Zwykle o północy.",
  ["A medianoche.", "A las diez.", "A las diez y media."],
);
// CONECTAR
k.match(
  "pl-es-u5a-match-routine",
  "connect",
  "Une cada actividad con su traducción.",
  "Budzić się = despertarse; wstawać = levantarse; kłaść się spać = acostarse.",
  [
    ["budzić się", "despertarse"],
    ["wstawać", "levantarse"],
    ["ubierać się", "vestirse"],
    ["wracać do domu", "volver a casa"],
    ["kłaść się spać", "acostarse"],
    ["robić zakupy", "hacer la compra"],
  ],
);
k.match(
  "pl-es-u5a-match-meals",
  "connect",
  "Une cada comida con su traducción.",
  "Obiad = comida principal; kolacja = cena; podwieczorek = merienda.",
  [
    ["śniadanie", "el desayuno"],
    ["obiad", "la comida principal"],
    ["podwieczorek", "la merienda"],
    ["kolacja", "la cena"],
  ],
);
k.mc(
  "pl-es-u5a-wieczorem",
  "connect",
  "¿Qué significa wieczorem?",
  "Wieczorem = por la noche (antes de dormir); w nocy = de madrugada.",
  ["Por la noche, al final del día.", "Por la mañana.", "A mediodía."],
);
k.match(
  "pl-es-u5a-match-frequency",
  "connect",
  "Une cada adverbio con su traducción.",
  "Zawsze = siempre; rzadko = pocas veces; nigdy nie = nunca.",
  [
    ["zawsze", "siempre"],
    ["często", "a menudo"],
    ["czasami", "a veces"],
    ["rzadko", "pocas veces"],
  ],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u5a-gap-sie",
  "structure",
  "Completa con la forma correcta.",
  "Ja budzę się; ty myjesz się; on ubiera się.",
  "Ja ___ się o szóstej, ty ___ się o siódmej, a Marek ___ się szybko.",
  [["budzę"], ["myjesz"], ["ubiera"]],
);
k.mc(
  "pl-es-u5a-sie-position",
  "structure",
  "¿Cuál es correcto?",
  "Się no abre la frase y no cambia con la persona.",
  ["Budzę się o szóstej.", "Się budzę o szóstej.", "Budzę mi o szóstej."],
);
k.gap(
  "pl-es-u5a-gap-wstawac",
  "structure",
  "Completa con wstawać.",
  "Wstaję, wstajesz, wstaje… (sin się).",
  "Ja ___ wcześnie, a moi rodzice ___ późno. O której ty ___?",
  [["wstaję"], ["wstają"], ["wstajesz"]],
);
k.match(
  "pl-es-u5a-match-time",
  "structure",
  "Une cada hora con su forma en polaco.",
  "Ordinal femenino: pierwsza, trzecia, ósma, dwunasta.",
  [
    ["1:00", "pierwsza"],
    ["3:00", "trzecia"],
    ["8:00", "ósma"],
    ["12:00", "dwunasta"],
    ["0:00", "północ"],
  ],
);
k.gap(
  "pl-es-u5a-gap-o-ktorej",
  "structure",
  "Completa con o + la hora en locativo (-ej).",
  "7 → o siódmej; 9 → o dziewiątej; 2 → o drugiej.",
  "Wstaję o ___ (7), pracuję od ___ (9) i wracam o ___ (17, en 24 h).",
  [["siódmej"], ["dziewiątej"], ["siedemnastej"]],
);
k.mc(
  "pl-es-u5a-wpol",
  "structure",
  "¿Qué hora es wpół do dziesiątej?",
  "Wpół do… = media hora antes: 9:30.",
  ["9:30", "10:30", "10:00"],
);
k.mc(
  "pl-es-u5a-kwadrans",
  "structure",
  "¿Qué hora es kwadrans po ósmej?",
  "Kwadrans po = y cuarto: 8:15.",
  ["8:15", "7:45", "8:45"],
);
k.mc(
  "pl-es-u5a-za-kwadrans",
  "structure",
  "¿Qué hora es za kwadrans dziewiąta?",
  "Za kwadrans = menos cuarto: 8:45.",
  ["8:45", "9:15", "9:45"],
);
k.mc("pl-es-u5a-nigdy", "structure", "¿Cuál es correcto?", "Nigdy + nie + verbo + genitivo.", [
  "Nigdy nie piję kawy.",
  "Nigdy piję kawę.",
  "Nie nigdy piję kawy.",
]);
k.order(
  "pl-es-u5a-order-day",
  "structure",
  "Ordena: Normalmente desayuno a las siete.",
  "Zwykle + jem śniadanie + o siódmej.",
  ["Zwykle", "jem", "śniadanie", "o", "siódmej."],
);
k.order(
  "pl-es-u5a-order-question",
  "structure",
  "Ordena: ¿A qué hora te acuestas?",
  "O której + kładziesz się + spać?",
  ["O", "której", "kładziesz", "się", "spać?"],
);
// SONAR
k.mc("pl-es-u5a-sound-chleb", "sound", "¿Cómo suena chleb?", "B final se ensordece: [chlep].", [
  "[chlep]",
  "[chleb] con b sonora",
  "[kleb]",
]);
k.mc("pl-es-u5a-sound-wpol", "sound", "¿Cómo empieza wpół?", "W ante p se ensordece: [fpuw].", [
  "[fp…]",
  "[vp…]",
  "[up…]",
]);
k.tf(
  "pl-es-u5a-sound-obiad",
  "sound",
  "La d final de obiad suena como una t.",
  "Sí: [obiat].",
  true,
);
// CULTURA
k.mc(
  "pl-es-u5a-reading-wake",
  "culture",
  "Lectura: ¿a qué hora se despierta el señor Marek?",
  "Budzi się o czwartej.",
  ["A las cuatro.", "A las cinco.", "A las cinco y media."],
);
k.mc(
  "pl-es-u5a-reading-job",
  "culture",
  "Lectura: ¿en qué trabaja el señor Marek?",
  "Jest motorniczym: prowadzi tramwaj.",
  ["Conduce un tranvía.", "Es panadero.", "Trabaja en una oficina."],
);
k.tf(
  "pl-es-u5a-reading-obiad",
  "culture",
  "Lectura: el señor Marek come con su familia a las tres de la tarde.",
  "Je obiad z rodziną o piętnastej.",
  true,
);
k.mc(
  "pl-es-u5a-culture-work",
  "culture",
  "Cultura: ¿cuál es un horario laboral típico en Polonia?",
  "De 8:00 a 16:00, y el obiad al volver a casa.",
  ["De 8:00 a 16:00.", "De 10:00 a 20:00 con pausa larga.", "De 9:00 a 14:00 y de 17:00 a 20:00."],
);
k.tf(
  "pl-es-u5a-culture-cisza",
  "culture",
  "Cultura: la cisza nocna es el silencio nocturno en los edificios, de 22:00 a 6:00.",
  "Sí: en esas horas no se hace ruido en los bloques de pisos.",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u5a-translate-time",
  "transform",
  "Escribe en polaco: ¿Qué hora es? — Son las nueve.",
  "Która jest godzina? — Jest dziewiąta.",
  [
    "Która jest godzina? Jest dziewiąta.",
    "Która jest godzina? — Jest dziewiąta.",
    "Która godzina? Jest dziewiąta.",
  ],
);
k.ta(
  "pl-es-u5a-translate-get-up",
  "transform",
  "Escribe en polaco: Me levanto a las siete y me ducho.",
  "Wstaję o siódmej i biorę prysznic.",
  ["Wstaję o siódmej i biorę prysznic.", "Wstaję o siódmej i myję się."],
);
k.ta(
  "pl-es-u5a-translate-never",
  "transform",
  "Escribe en polaco: Nunca veo la tele.",
  "Nigdy nie oglądam + genitivo: telewizji.",
  ["Nigdy nie oglądam telewizji."],
);
k.ta(
  "pl-es-u5a-translate-dinner",
  "transform",
  "Escribe en polaco: Ceno a las ocho.",
  "Jem kolację o ósmej (o dwudziestej).",
  ["Jem kolację o ósmej.", "Jem kolację o dwudziestej.", "O ósmej jem kolację."],
);
k.ta(
  "pl-es-u5a-translate-bed",
  "transform",
  "Escribe en polaco: Normalmente me acuesto a medianoche.",
  "Zwykle kładę się spać o północy.",
  ["Zwykle kładę się spać o północy.", "Zwykle kładę się o północy."],
);
// EXPRESAR
k.write(
  "pl-es-u5a-write-day",
  "express",
  "Describe un día normal tuyo, de la mañana a la noche, con al menos seis horas y tres adverbios de frecuencia.",
  "Revisa: verbos con się, o + hora en locativo, nigdy nie + genitivo.",
  "Zwykle budzę się o siódmej. Wstaję, myję się i jem śniadanie. O ósmej jadę do pracy tramwajem. Pracuję od dziewiątej do siedemnastej. W pracy jem coś małego o dwunastej. Wracam do domu o wpół do szóstej i jem obiad. Czasami robię zakupy. Wieczorem odpoczywam, a o jedenastej kładę się spać. Nigdy nie oglądam telewizji.",
  ["mañana", "trabajo", "tarde", "noche", "seis horas", "frecuencia"],
  40,
  110,
  8,
);
k.write(
  "pl-es-u5a-write-compare",
  "express",
  "Compara el horario de un día en España y en Polonia: comidas, trabajo y hora de acostarse.",
  "W Hiszpanii… a w Polsce…; o + hora.",
  "W Hiszpanii jemy obiad o czternastej albo o piętnastej, a w Polsce o piętnastej albo o siedemnastej. Hiszpanie jedzą kolację o dwudziestej pierwszej, a Polacy o dziewiętnastej. W Polsce ludzie wstają wcześnie i kładą się spać wcześnie.",
  ["comidas", "trabajo o sueño", "comparación"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 5 (pl-es) total", renumber(5, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u5-tired.png",
    prompt:
      "in a bright office a young man yawns widely holding a coffee mug while a female coworker at the next desk laughs, laptops and plants on the desks, morning light, no clocks or screens visible",
  },
]);
