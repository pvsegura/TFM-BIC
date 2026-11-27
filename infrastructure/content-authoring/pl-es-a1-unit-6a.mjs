// Polish for Spanish speakers — A1 unit 6A (Co lubisz robić?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-6a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(6, "pl-es-unit-6-likes", 6100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u6a-listen-javier",
  "perceive",
  "Diálogo: ¿qué le gusta hacer a Javier?",
  "Lubię biegać i gotować.",
  ["Correr y cocinar.", "Leer y escuchar música.", "Ver fútbol."],
);
k.tf(
  "pl-es-u6a-listen-cook",
  "perceive",
  "Diálogo: a Ola le encanta cocinar.",
  "Nie lubię gotować. Wolę jeść w restauracji.",
  false,
);
k.mc(
  "pl-es-u6a-listen-jazz",
  "perceive",
  "Diálogo: ¿qué música le encanta a Ola?",
  "Uwielbiam jazz — y a Javier también le gusta.",
  ["El jazz.", "El rock.", "La música clásica."],
);
k.mc(
  "pl-es-u6a-listen-football",
  "perceive",
  "Diálogo: ¿qué piensan los dos del fútbol?",
  "Javier: nie lubię piłki nożnej. Ola: ja też nie!",
  ["No les gusta a ninguno.", "Les encanta a los dos.", "A Ola sí, a Javier no."],
);
k.mc(
  "pl-es-u6a-listen-tatry",
  "perceive",
  "Diálogo: ¿adónde va Ola a menudo en verano?",
  "Latem często jeżdżę w Tatry.",
  ["A los Tatras.", "Al mar.", "A España."],
);
// CONECTAR
k.match(
  "pl-es-u6a-match-hobbies",
  "connect",
  "Une cada actividad con su traducción.",
  "Słuchać muzyki = escuchar música; chodzić po górach = hacer senderismo.",
  [
    ["słuchać muzyki", "escuchar música"],
    ["chodzić po górach", "hacer senderismo"],
    ["tańczyć", "bailar"],
    ["podróżować", "viajar"],
    ["robić zdjęcia", "hacer fotos"],
    ["spotykać się z przyjaciółmi", "quedar con amigos"],
  ],
);
k.mc(
  "pl-es-u6a-gram-na",
  "connect",
  "Completa: Mój brat gra ___ gitarze i ___ piłkę nożną.",
  "Grać na + instrumento (locativo); grać w + juego (acusativo).",
  ["na / w", "w / na", "na / na"],
);
k.match(
  "pl-es-u6a-match-things",
  "connect",
  "Une cada palabra con su traducción.",
  "Kryminały = novela negra; morze = el mar; taniec = el baile.",
  [
    ["kryminały", "la novela negra"],
    ["morze", "el mar"],
    ["góry", "la montaña"],
    ["taniec", "el baile"],
    ["mecz", "el partido"],
  ],
);
k.mc("pl-es-u6a-wole", "connect", "¿Qué significa wolę?", "Wolę = prefiero.", [
  "Prefiero.",
  "Quiero.",
  "Puedo.",
]);
// ESTRUCTURAR
k.gap(
  "pl-es-u6a-gap-lubic",
  "structure",
  "Completa con lubić.",
  "Ja lubię, ty lubisz, oni lubią.",
  "Ja ___ czytać. Czy ty ___ jazz? Moi rodzice ___ spacerować.",
  [["lubię"], ["lubisz"], ["lubią"]],
);
k.mc(
  "pl-es-u6a-plural",
  "structure",
  "¿Cómo dices «me gustan los gatos»?",
  "Lubić concuerda con la persona, no con lo que gusta: lubię koty.",
  ["Lubię koty.", "Lubią mi koty.", "Koty mi lubię."],
);
k.gap(
  "pl-es-u6a-gap-accusative",
  "structure",
  "Completa con el acusativo después de lubię.",
  "Kawa → kawę; muzyka → muzykę; jazz → jazz.",
  "Lubię ___ (kawa), ___ (muzyka klasyczna) i ___ (jazz).",
  [["kawę"], ["muzykę klasyczną"], ["jazz"]],
);
k.gap(
  "pl-es-u6a-gap-genitive",
  "structure",
  "Completa con el genitivo después de nie lubię.",
  "Kawa → kawy; sport → sportu; piłka nożna → piłki nożnej.",
  "Nie lubię ___ (kawa), ___ (sport) ani ___ (piłka nożna).",
  [["kawy"], ["sportu"], ["piłki nożnej"]],
);
k.mc(
  "pl-es-u6a-podoba",
  "structure",
  "Llegas a Cracovia por primera vez y te encanta lo que ves. ¿Qué dices?",
  "Impresión de algo que ves: podobać się.",
  ["Kraków bardzo mi się podoba.", "Lubię Kraków od zawsze.", "Ja podobam Kraków."],
);
k.mc(
  "pl-es-u6a-podobaja",
  "structure",
  "Completa: ___ mi się te zdjęcia.",
  "Varias cosas: podobają.",
  ["Podobają", "Podoba", "Lubią"],
);
k.mc(
  "pl-es-u6a-ja-tez",
  "structure",
  "— Lubię góry. Tú también. ¿Qué dices?",
  "Coincides con una afirmación: ja też.",
  ["Ja też.", "Ja też nie.", "A ja nie."],
);
k.mc(
  "pl-es-u6a-ja-tez-nie",
  "structure",
  "— Nie lubię poniedziałków. Tú tampoco. ¿Qué dices?",
  "Coincides con una negación: ja też nie.",
  ["Ja też nie.", "Ja też.", "A ja tak."],
);
k.mc(
  "pl-es-u6a-a-ja-tak",
  "structure",
  "— Nie lubię gotować. A ti sí te gusta. ¿Qué dices?",
  "No coincides con una negación: a ja tak.",
  ["A ja tak.", "Ja też nie.", "Ja też."],
);
k.mc("pl-es-u6a-sluchac", "structure", "¿Cuál es correcto?", "Słuchać + genitivo: muzyki.", [
  "Słucham muzyki.",
  "Słucham muzykę.",
  "Słucham na muzyce.",
]);
k.order(
  "pl-es-u6a-order-likes",
  "structure",
  "Ordena: Me gusta mucho bailar, pero prefiero cantar.",
  "Bardzo lubię + infinitivo, ale wolę + infinitivo.",
  ["Bardzo", "lubię", "tańczyć,", "ale", "wolę", "śpiewać."],
);
k.order(
  "pl-es-u6a-order-question",
  "structure",
  "Ordena: ¿Qué te gusta hacer el fin de semana?",
  "Co + lubisz + robić + w weekend?",
  ["Co", "lubisz", "robić", "w", "weekend?"],
);
// SONAR
k.match(
  "pl-es-u6a-sound-dz",
  "sound",
  "Une cada palabra con su sonido.",
  "Bardzo: dz; jeżdżę: dż; dziękuję: dź.",
  [
    ["bardzo", "dz (ds en un golpe)"],
    ["jeżdżę", "dż (j inglesa dura)"],
    ["dziękuję", "dź (y enfática)"],
  ],
);
k.tf(
  "pl-es-u6a-sound-dzien",
  "sound",
  "En dzień, dzie suena dura, como en «jungle».",
  "No: dzi + vocal es la versión suave, dź: [dźeń].",
  false,
);
k.mc(
  "pl-es-u6a-sound-dzem",
  "sound",
  "¿Cómo se escribe la palabra «mermelada» que suena [dżem]?",
  "Dż dura: dżem.",
  ["dżem", "dźem", "dzem"],
);
// CULTURA
k.mc(
  "pl-es-u6a-reading-when",
  "culture",
  "Lectura: ¿cuándo se recogen setas en Polonia?",
  "Jesienią, we wrześniu i w październiku.",
  ["En otoño, en septiembre y octubre.", "En verano.", "En invierno."],
);
k.tf(
  "pl-es-u6a-reading-grandma",
  "culture",
  "Lectura: la abuela conoce todas las setas.",
  "Zna wszystkie grzyby: borowiki, kurki, maślaki.",
  true,
);
k.mc(
  "pl-es-u6a-reading-likes",
  "culture",
  "Lectura: ¿qué le gusta mucho a la nieta (la narradora)?",
  "Bardzo lubię jej zupę grzybową.",
  ["La sopa de setas de la abuela.", "Levantarse temprano.", "Recoger setas sola."],
);
k.mc(
  "pl-es-u6a-culture-tatry",
  "culture",
  "Cultura: ¿qué son los Tatras?",
  "Las montañas más altas de Polonia, en la frontera con Eslovaquia.",
  ["Las montañas más altas de Polonia.", "Un lago del norte.", "Un barrio de Cracovia."],
);
k.tf(
  "pl-es-u6a-culture-volleyball",
  "culture",
  "Cultura: el voleibol y los saltos de esquí son deportes muy seguidos en Polonia.",
  "Sí: la selección de voleibol está entre las mejores del mundo y los saltos de esquí reúnen a millones de espectadores.",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u6a-translate-love",
  "transform",
  "Escribe en polaco: Me encanta la montaña.",
  "Uwielbiam + acusativo: góry.",
  ["Uwielbiam góry."],
);
k.ta(
  "pl-es-u6a-translate-parents",
  "transform",
  "Escribe en polaco: A mis padres les gusta pasear.",
  "Sujeto = mis padres: moi rodzice lubią spacerować.",
  ["Moi rodzice lubią spacerować."],
);
k.ta(
  "pl-es-u6a-translate-me-neither",
  "transform",
  "Responde en polaco que tú tampoco: — Nie lubię zimy.",
  "Coincides con una negación: ja też nie.",
  ["Ja też nie.", "Ja też nie lubię zimy.", "Ja też nie!"],
);
k.ta(
  "pl-es-u6a-translate-piano",
  "transform",
  "Escribe en polaco: Toco el piano, pero no juego al fútbol.",
  "Gram na pianinie, ale nie gram w piłkę nożną.",
  ["Gram na pianinie, ale nie gram w piłkę nożną.", "Gram na pianinie, ale nie gram w piłkę."],
);
k.ta(
  "pl-es-u6a-translate-photos",
  "transform",
  "Escribe en polaco: Me gustan tus fotos.",
  "Impresión: podobają mi się twoje zdjęcia.",
  [
    "Podobają mi się twoje zdjęcia.",
    "Twoje zdjęcia mi się podobają.",
    "Twoje zdjęcia bardzo mi się podobają.",
  ],
);
// EXPRESAR
k.write(
  "pl-es-u6a-write-profile",
  "express",
  "Escribe tu perfil para un intercambio de idiomas con un polaco: quién eres, qué te gusta, qué te encanta, qué no soportas y qué buscas.",
  "Revisa: lubię + infinitivo o acusativo, nie lubię + genitivo, uwielbiam, grać w / grać na.",
  "Cześć! Mam na imię Lucía i jestem z Sewilli. Mieszkam w Warszawie. W wolnym czasie lubię czytać, gotować i spacerować po parku. Uwielbiam koty i polskie filmy. Gram na gitarze. Nie znoszę zimy! Szukam osoby do rozmowy po polsku i po hiszpańsku, na przykład we wtorek wieczorem.",
  ["presentación", "tres gustos", "uwielbiam", "nie znoszę / nie lubię", "qué buscas"],
  35,
  100,
  8,
);
k.write(
  "pl-es-u6a-write-reply",
  "express",
  "Responde a este mensaje: «Uwielbiam kino, ale nie lubię sportu. A ty?». Reacciona a las dos cosas y añade dos gustos tuyos.",
  "Ja też / ja też nie / a ja tak / a ja nie, y una pregunta.",
  "Cześć, Ola! Ja też uwielbiam kino, zwłaszcza polskie filmy. A ja lubię sport: biegam i gram w tenisa. Bardzo lubię też gotować. Lubisz góry?",
  ["reacción al cine", "reacción al deporte", "dos gustos", "pregunta"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 6 (pl-es) total", renumber(6, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u6-tandem.png",
    prompt:
      "a young man and a young woman talking and laughing on a park bench in autumn, she holds a closed book, he holds headphones, fallen leaves around, no text or signs",
  },
]);
