// Polish for Spanish speakers — A1 unit 6B (Umówmy się!) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-6b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(6, "pl-es-unit-6-plans", 6500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u6b-listen-invite",
  "perceive",
  "Diálogo: ¿a qué invita Tomek a Javier?",
  "Masz ochotę zagrać w siatkówkę w sobotę?",
  ["A jugar al voleibol.", "A ir a la piscina.", "A ver un partido de fútbol."],
);
k.tf(
  "pl-es-u6b-listen-skill",
  "perceive",
  "Diálogo: Javier juega muy bien al voleibol.",
  "Nie umiem grać za dobrze — no sabe jugar muy bien.",
  false,
);
k.mc(
  "pl-es-u6b-listen-saturday",
  "perceive",
  "Diálogo: ¿por qué Javier no puede el sábado?",
  "Muszę pomóc koledze w przeprowadzce.",
  [
    "Tiene que ayudar a un amigo con una mudanza.",
    "Tiene que trabajar.",
    "Va a casa de sus padres.",
  ],
);
k.mc(
  "pl-es-u6b-listen-when",
  "perceive",
  "Diálogo: ¿cuándo y dónde quedan?",
  "W niedzielę o dziesiątej w hali przy parku.",
  [
    "El domingo a las diez en el pabellón junto al parque.",
    "El sábado a las diez en la oficina.",
    "El domingo a las doce en un bar.",
  ],
);
k.tf(
  "pl-es-u6b-listen-ball",
  "perceive",
  "Diálogo: Javier tiene que llevar balón.",
  "Nie, mamy piłkę — solo ropa de deporte, zapatillas y agua.",
  false,
);
// CONECTAR
k.match(
  "pl-es-u6b-match-sports",
  "connect",
  "Une cada deporte con su traducción.",
  "Siatkówka (siatka, red) = voleibol; koszykówka (kosz, cesta) = baloncesto.",
  [
    ["siatkówka", "el voleibol"],
    ["koszykówka", "el baloncesto"],
    ["piłka ręczna", "el balonmano"],
    ["jeździć na nartach", "esquiar"],
    ["jeździć na łyżwach", "patinar sobre hielo"],
    ["pływać", "nadar"],
  ],
);
k.match(
  "pl-es-u6b-match-places",
  "connect",
  "Une cada lugar o cosa con su traducción.",
  "Basen = piscina; boisko = cancha; strój sportowy = ropa de deporte.",
  [
    ["basen", "la piscina"],
    ["boisko", "la cancha"],
    ["siłownia", "el gimnasio"],
    ["strój sportowy", "la ropa de deporte"],
    ["drużyna", "el equipo"],
  ],
);
k.mc(
  "pl-es-u6b-chetnie",
  "connect",
  "¿Qué significa chętnie?",
  "Chętnie = con gusto, con ganas (de chęć).",
  ["Con mucho gusto.", "Por desgracia.", "Quizá otro día."],
);
k.mc(
  "pl-es-u6b-wygrywac",
  "connect",
  "Completa: Nasza drużyna zawsze ___ — nigdy nie wygrywa!",
  "Przegrywać = perder (lo contrario de wygrywać).",
  ["przegrywa", "wygrywa", "gra"],
);
// ESTRUCTURAR
k.mc(
  "pl-es-u6b-ochota",
  "structure",
  "¿Cuál es correcto?",
  "Masz ochotę + na + acusativo o + infinitivo.",
  ["Masz ochotę na kawę?", "Masz ochotę kawa?", "Masz ochotę z kawą?"],
);
k.mc(
  "pl-es-u6b-polite-no",
  "structure",
  "— Idziemy w piątek do kina? No puedes. ¿Cuál es la respuesta más educada?",
  "Lástima + motivo + otro momento.",
  ["Szkoda, w piątek muszę pracować. Może innym razem?", "Nie.", "Nie chcę iść z tobą."],
);
k.gap(
  "pl-es-u6b-gap-umiec",
  "structure",
  "Completa con umieć.",
  "Ja umiem, ty umiesz, oni umieją.",
  "Ja nie ___ pływać, ale moja siostra ___ bardzo dobrze. Czy wy ___ jeździć na nartach?",
  [["umiem"], ["umie"], ["umiecie"]],
);
k.gap(
  "pl-es-u6b-gap-wiedziec",
  "structure",
  "Completa con wiedzieć.",
  "Ja wiem, ty wiesz, oni wiedzą.",
  "Czy ty ___, gdzie jest basen? Nie, nie ___. Może Tomek i Kasia ___.",
  [["wiesz"], ["wiem"], ["wiedzą"]],
);
k.mc(
  "pl-es-u6b-umiem-moge",
  "structure",
  "Nunca has aprendido a esquiar. ¿Qué dices?",
  "Falta de habilidad: nie umiem.",
  ["Nie umiem jeździć na nartach.", "Nie mogę jeździć na nartach.", "Nie wiem jeździć na nartach."],
);
k.mc(
  "pl-es-u6b-moge-today",
  "structure",
  "Sabes nadar, pero hoy te duele la espalda. ¿Qué dices?",
  "Habilidad sí, posibilidad no: dzisiaj nie mogę.",
  ["Dzisiaj nie mogę pływać.", "Dzisiaj nie umiem pływać.", "Dzisiaj nie znam pływać."],
);
k.match(
  "pl-es-u6b-match-know",
  "structure",
  "Une cada frase con el verbo que necesita.",
  "Habilidad: umieć; dato: wiedzieć; lugar o persona: znać; posibilidad: móc.",
  [
    ["… pływać (sé nadar)", "umiem"],
    ["…, gdzie to jest (sé dónde está)", "wiem"],
    ["… Kraków (conozco Cracovia)", "znam"],
    ["Dzisiaj nie … (hoy no puedo)", "mogę"],
  ],
);
k.mc(
  "pl-es-u6b-znam",
  "structure",
  "¿Cómo dices «conozco a Tomek»?",
  "Persona: znać + acusativo (Tomek → Tomka).",
  ["Znam Tomka.", "Wiem Tomka.", "Umiem Tomka."],
);
k.gap(
  "pl-es-u6b-gap-na-do",
  "structure",
  "Completa con na o do.",
  "Na + actividades y eventos (basen, mecz, piwo); do + edificios (kino).",
  "W sobotę idę ___ basen, w niedzielę ___ mecz, a wieczorem ___ kina.",
  [["na"], ["na"], ["do"]],
);
k.mc(
  "pl-es-u6b-pasuje",
  "structure",
  "¿Cómo preguntas a un amigo «¿te va bien a las seis?»?",
  "Pasuje ci + o + hora en locativo.",
  ["Pasuje ci o szóstej?", "Pasujesz o szóstej?", "Pasuje ty o sześć?"],
);
k.order(
  "pl-es-u6b-order-meet",
  "structure",
  "Ordena: Quedamos el domingo a las diez delante del pabellón.",
  "Spotykamy się + kiedy + o której + gdzie.",
  ["Spotykamy", "się", "w", "niedzielę", "o", "dziesiątej", "przed", "halą."],
);
k.order(
  "pl-es-u6b-order-sorry",
  "structure",
  "Ordena: Por desgracia, el sábado no puedo.",
  "Niestety + w sobotę + nie mogę.",
  ["Niestety", "w", "sobotę", "nie", "mogę."],
);
// SONAR
k.mc(
  "pl-es-u6b-sound-wparku",
  "sound",
  "¿Cómo se pronuncia w parku?",
  "W se pega y se ensordece ante p: [fparku].",
  ["[fparku]", "[v] — pausa — [parku]", "[u-parku]"],
);
k.mc(
  "pl-es-u6b-sound-zbratem",
  "sound",
  "¿Cómo se pronuncia z bratem?",
  "Ante consonante sonora, z se mantiene sonora y se pega: [zbratem].",
  ["[zbratem]", "[sbratem]", "[ze-bratem]"],
);
k.tf(
  "pl-es-u6b-sound-ze",
  "sound",
  "Delante de mną se dice ze (ze mną) para poder pronunciarlo.",
  "Sí: ante grupos difíciles se añade e: ze mną, we wtorek.",
  true,
);
// CULTURA
k.mc(
  "pl-es-u6b-reading-people",
  "culture",
  "Lectura: ¿cuántas personas necesitan para jugar?",
  "Potrzebujemy dwunastu osób.",
  ["Doce.", "Diez.", "Seis."],
);
k.mc(
  "pl-es-u6b-reading-shoes",
  "culture",
  "Lectura: ¿cómo resuelve Javier el problema de las zapatillas?",
  "Piotr ma dodatkowe buty, rozmiar czterdzieści trzy.",
  ["Piotr le presta unas del 43.", "Se compra unas nuevas.", "Juega descalzo."],
);
k.tf(
  "pl-es-u6b-reading-kasia",
  "culture",
  "Lectura: Kasia no juega porque le duele la pierna, pero irá a mirar.",
  "Boli mnie noga, ale chętnie przyjdę popatrzeć.",
  true,
);
k.mc(
  "pl-es-u6b-culture-late",
  "culture",
  "Cultura: has quedado con polacos a las diez para jugar. ¿Cuándo llegas?",
  "Los polacos suelen ser puntuales, sobre todo para el deporte y el trabajo.",
  ["A las diez.", "A las diez y media: es normal.", "Cuando quieras."],
);
k.tf(
  "pl-es-u6b-culture-multisport",
  "culture",
  "Cultura: muchas empresas polacas dan a sus empleados una tarjeta para gimnasios y piscinas.",
  "Sí: tarjetas como Multisport son un beneficio muy común.",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u6b-translate-invite",
  "transform",
  "Escribe en polaco: ¿Te apetece jugar al tenis el sábado?",
  "Masz ochotę + zagrać / grać w tenisa + w sobotę?",
  [
    "Masz ochotę zagrać w tenisa w sobotę?",
    "Masz ochotę grać w tenisa w sobotę?",
    "Masz ochotę w sobotę zagrać w tenisa?",
  ],
);
k.ta(
  "pl-es-u6b-translate-cant",
  "transform",
  "Escribe en polaco: Por desgracia no puedo, tengo que trabajar.",
  "Niestety nie mogę, muszę pracować.",
  ["Niestety nie mogę, muszę pracować.", "Niestety nie mogę. Muszę pracować."],
);
k.ta(
  "pl-es-u6b-translate-swim",
  "transform",
  "Escribe en polaco: No sé nadar.",
  "Habilidad: nie umiem pływać.",
  ["Nie umiem pływać."],
);
k.ta(
  "pl-es-u6b-translate-time",
  "transform",
  "Escribe en polaco: ¿A qué hora quedamos?",
  "O której się spotykamy?",
  ["O której się spotykamy?", "O której się umawiamy?"],
);
k.ta(
  "pl-es-u6b-translate-pool",
  "transform",
  "Escribe en polaco: El martes voy a la piscina.",
  "We wtorek idę na basen.",
  ["We wtorek idę na basen.", "Idę na basen we wtorek.", "We wtorek chodzę na basen."],
);
// EXPRESAR
k.write(
  "pl-es-u6b-write-invite",
  "express",
  "Escribe un mensaje a un compañero de trabajo: invítale a hacer deporte u otro plan, propón día, hora y lugar, y di qué tiene que llevar.",
  "Revisa: masz ochotę…?, spotykamy się w … o … przed / w …, iść na + acusativo, weź…",
  "Cześć, Marta! Masz ochotę pograć w koszykówkę w sobotę rano? Gramy w hali przy parku. Spotykamy się o dziesiątej przed halą. Weź strój sportowy i wodę. Potem idziemy na kawę. Pasuje ci?",
  ["invitación", "día y hora", "lugar", "qué llevar", "pregunta final"],
  25,
  80,
  6,
);
k.write(
  "pl-es-u6b-write-decline",
  "express",
  "Responde a la invitación «Masz ochotę iść na koncert w piątek?»: recházala con educación, explica por qué y propón otro plan.",
  "Niestety nie mogę, bo…; może…?; pasuje ci…?",
  "Dziękuję za zaproszenie! Niestety w piątek nie mogę, bo muszę pracować do dwudziestej. Może w sobotę pójdziemy na spacer albo do kina? Pasuje ci o osiemnastej?",
  ["agradecimiento", "motivo", "otro plan", "hora"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 6 (pl-es) total", renumber(6, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u6-volleyball.png",
    prompt:
      "two male office coworkers chatting next to a desk, one holds a volleyball under his arm and smiles, the other listens with a coffee mug, bright modern office, no screens with text or signs",
  },
]);
