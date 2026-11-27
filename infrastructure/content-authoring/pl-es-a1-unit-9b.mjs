// Polish for Spanish speakers — A1 unit 9B (Gdzie jedziesz na wakacje?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-9b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(9, "pl-es-unit-9-holidays", 9500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u9b-listen-christmas",
  "perceive",
  "Diálogo: ¿dónde pasará Javier la Navidad?",
  "Do Hiszpanii, do rodziców.",
  ["En España, con sus padres.", "En Cracovia, con la abuela de Kasia.", "En la montaña."],
);
k.mc(
  "pl-es-u9b-listen-how-long",
  "perceive",
  "Diálogo: ¿para cuánto tiempo se va Javier?",
  "Na dwa tygodnie.",
  ["Dos semanas.", "Un mes.", "Tres días."],
);
k.tf(
  "pl-es-u9b-listen-wigilia",
  "perceive",
  "Diálogo: Javier va a pasar la Nochebuena en casa de la abuela de Kasia.",
  "Javier vuela a Madrid el 20 de diciembre: quizá el año que viene.",
  false,
);
k.mc(
  "pl-es-u9b-listen-summer",
  "perceive",
  "Diálogo: ¿qué hace Kasia cada verano?",
  "Jeżdżę na Mazury, nad jezioro. Pływamy żaglówką i śpimy w namiocie.",
  ["Va a los lagos, navega y duerme en tienda.", "Va a España a la playa.", "Trabaja en Cracovia."],
);
k.mc(
  "pl-es-u9b-listen-mountains",
  "perceive",
  "Diálogo: ¿cuándo irán a la montaña?",
  "W góry pojedziemy we wrześniu, kiedy nie ma turystów.",
  ["En septiembre.", "En julio.", "En Navidad."],
);
// CONECTAR
k.match(
  "pl-es-u9b-match-words",
  "connect",
  "Une cada palabra con su traducción.",
  "Jezioro = lago; namiot = tienda de campaña; żaglówka = velero.",
  [
    ["jezioro", "el lago"],
    ["namiot", "la tienda de campaña"],
    ["żaglówka", "el velero"],
    ["wieś", "el campo, el pueblo"],
    ["wycieczka", "la excursión"],
    ["walizka", "la maleta"],
  ],
);
k.mc(
  "pl-es-u9b-majowka",
  "connect",
  "¿Qué es la majówka?",
  "El puente largo de principios de mayo.",
  ["El puente de principios de mayo.", "La Nochebuena.", "Las vacaciones de verano."],
);
k.mc(
  "pl-es-u9b-urlop",
  "connect",
  "¿Qué diferencia hay entre wakacje y urlop?",
  "Wakacje: las vacaciones (sobre todo de verano, escolares); urlop: los días libres del trabajo.",
  ["Urlop son las vacaciones del trabajo.", "Son exactamente lo mismo.", "Urlop es la Navidad."],
);
k.mc(
  "pl-es-u9b-za-granice",
  "connect",
  "¿Qué significa jadę za granicę?",
  "Za granicę = al extranjero.",
  ["Voy al extranjero.", "Voy a la frontera a trabajar.", "Vuelvo a casa."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u9b-gap-dokad",
  "structure",
  "Completa adónde vas: nad, w, na o do.",
  "Nad morze, w góry, na wieś, do Hiszpanii.",
  "Latem jadę ___ morze, zimą ___ góry, na majówkę ___ wieś, a na święta ___ Hiszpanii.",
  [["nad"], ["w"], ["na"], ["do"]],
);
k.match(
  "pl-es-u9b-match-where",
  "structure",
  "Une cada «adónde» con su «dónde».",
  "Nad morze → nad morzem; w góry → w górach; na wieś → na wsi.",
  [
    ["nad morze", "nad morzem"],
    ["w góry", "w górach"],
    ["na wieś", "na wsi"],
    ["za granicę", "za granicą"],
    ["na Mazury", "na Mazurach"],
  ],
);
k.mc(
  "pl-es-u9b-nad-morzem",
  "structure",
  "¿Cuál es correcto?",
  "Dónde: nad + instrumental (morzem).",
  ["Jestem nad morzem.", "Jestem nad morze.", "Jestem do morza."],
);
k.mc(
  "pl-es-u9b-w-gory",
  "structure",
  "¿Cómo dices «voy a la montaña»?",
  "Adónde: w + acusativo (góry).",
  ["Jadę w góry.", "Jadę do gór.", "Jadę w górach."],
);
k.gap(
  "pl-es-u9b-gap-perfective",
  "structure",
  "Completa con el futuro perfectivo.",
  "Pojechać → pojadę; polecieć → polecisz; wrócić → wrócimy.",
  "W lipcu ja ___ (pojechać) na Mazury, ty ___ (polecieć) do Madrytu, a my ___ (wrócić) w sierpniu.",
  [["pojadę"], ["polecisz"], ["wrócimy"]],
);
k.mc(
  "pl-es-u9b-bede-pojechac",
  "structure",
  "¿Cuál es correcto?",
  "El perfectivo ya es futuro: pojadę, sin będę.",
  ["Pojadę do Gdańska.", "Będę pojechać do Gdańska.", "Będę pojadę do Gdańska."],
);
k.mc(
  "pl-es-u9b-na-tydzien",
  "structure",
  "¿Cómo dices «para una semana»?",
  "Duración prevista: na + acusativo.",
  ["na tydzień", "przez tygodnia", "w tydzień"],
);
k.mc(
  "pl-es-u9b-jezdze",
  "structure",
  "Completa: Każdego lata ___ nad morze.",
  "Hábito: jeździć → jeżdżę.",
  ["jeżdżę", "jadę teraz", "pojadę"],
);
k.mc(
  "pl-es-u9b-ochota",
  "structure",
  "¿Cómo dices «tengo ganas de ver Gdańsk»?",
  "Mam ochotę + infinitivo.",
  ["Mam ochotę zobaczyć Gdańsk.", "Mam ochota zobaczyć Gdańsk.", "Jestem ochotę zobaczyć Gdańsk."],
);
k.order(
  "pl-es-u9b-order-fly",
  "structure",
  "Ordena: Volaré a Madrid el veinte de diciembre.",
  "Polecę do Madrytu + dwudziestego grudnia.",
  ["Polecę", "do", "Madrytu", "dwudziestego", "grudnia."],
);
k.order(
  "pl-es-u9b-order-lake",
  "structure",
  "Ordena: En verano siempre voy a un lago.",
  "Latem zawsze jeżdżę nad jezioro.",
  ["Latem", "zawsze", "jeżdżę", "nad", "jezioro."],
);
// SONAR
k.mc(
  "pl-es-u9b-sound-wies",
  "sound",
  "¿Qué significa wieś (con ś suave)?",
  "Wieś = el pueblo, el campo; wiesz (sz dura) = sabes.",
  ["El pueblo, el campo.", "Sabes.", "Todo."],
);
k.tf(
  "pl-es-u9b-sound-kasza",
  "sound",
  "Kasza y Kasia suenan igual.",
  "No: kasza lleva sz dura; Kasia, la si suave.",
  false,
);
k.mc(
  "pl-es-u9b-sound-prosze",
  "sound",
  "¿Cuál significa «por favor»?",
  "Proszę (sz dura); prosię (si suave) = cochinillo.",
  ["proszę", "prosię", "prosi"],
);
// CULTURA
k.mc(
  "pl-es-u9b-reading-dates",
  "culture",
  "Lectura: ¿qué se celebra el 1 y el 3 de mayo?",
  "Pierwszego maja Święto Pracy, trzeciego maja Święto Konstytucji.",
  [
    "El Día del Trabajo y el Día de la Constitución.",
    "Navidad y Año Nuevo.",
    "El santo de todos los polacos.",
  ],
);
k.mc(
  "pl-es-u9b-reading-family",
  "culture",
  "Lectura: ¿qué va a hacer el padre de Kasia en la majówka?",
  "Tata będzie łowić ryby.",
  ["Pescar.", "Leer.", "Montar en bici."],
);
k.tf(
  "pl-es-u9b-reading-summer",
  "culture",
  "Lectura: en julio y agosto los niños polacos van al colegio.",
  "W lipcu i w sierpniu dzieci nie chodzą do szkoły.",
  false,
);
k.mc(
  "pl-es-u9b-culture-mazury",
  "culture",
  "Cultura: ¿qué son las Mazury?",
  "Una región del noreste de Polonia con miles de lagos.",
  ["Una región de lagos.", "Una cordillera.", "Una playa del Báltico."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u9b-translate-where",
  "transform",
  "Escribe en polaco: ¿Adónde vas de vacaciones?",
  "Gdzie jedziesz na wakacje? (o Dokąd jedziesz…)",
  ["Dokąd jedziesz na wakacje?", "Gdzie jedziesz na wakacje?"],
);
k.ta(
  "pl-es-u9b-translate-sea",
  "transform",
  "Escribe en polaco: Voy al mar para una semana.",
  "Jadę nad morze na tydzień.",
  ["Jadę nad morze na tydzień.", "Na tydzień jadę nad morze."],
);
k.ta(
  "pl-es-u9b-translate-return",
  "transform",
  "Escribe en polaco: Volveré en enero.",
  "Wrócę w styczniu.",
  ["Wrócę w styczniu."],
);
k.ta(
  "pl-es-u9b-translate-mountains",
  "transform",
  "Escribe en polaco: Estamos en la montaña.",
  "Jesteśmy w górach.",
  ["Jesteśmy w górach."],
);
k.ta(
  "pl-es-u9b-translate-christmas",
  "transform",
  "Escribe en polaco: ¡Feliz Navidad!",
  "Wesołych Świąt!",
  ["Wesołych Świąt!", "Wesołych Świąt"],
);
// EXPRESAR
k.write(
  "pl-es-u9b-write-plans",
  "express",
  "Escribe a un amigo polaco tus planes para las próximas vacaciones: adónde vas, cuándo sales y vuelves, para cuánto tiempo, dónde dormirás y qué tienes ganas de hacer.",
  "Revisa: nad / w / na / do + acusativo, perfectivos (pojadę, polecę, wrócę), na + duración, mam ochotę.",
  "Cześć, Piotrek! W sierpniu pojadę nad morze, do Sopotu. Polecę do Gdańska z Madrytu dziesiątego sierpnia i wrócę dwudziestego czwartego. Jadę na dwa tygodnie. Będę spać w małym hotelu blisko plaży. Mam ochotę pływać, chodzić po plaży i jeść ryby. A ty? Gdzie jedziesz na wakacje?",
  ["destino", "fechas", "duración", "alojamiento", "deseos"],
  35,
  110,
  8,
);
k.write(
  "pl-es-u9b-write-habit",
  "express",
  "Escribe adónde vas normalmente de vacaciones en España y qué haces allí cada año.",
  "Zwykle / każdego lata jeżdżę…; tam + gdzie (nad morzem, w górach…).",
  "Każdego lata jeżdżę z rodziną na wieś, do domu dziadków w Andaluzji. Tam jest bardzo gorąco, więc rano chodzimy na basen, a wieczorem jemy kolację na tarasie. Czasami jeździmy też nad morze, do Malagi.",
  ["adónde vas cada año", "qué haces allí"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 9 (pl-es) total", renumber(9, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u9-lakes.png",
    prompt:
      "a small sailing boat on a calm lake surrounded by pine forest in summer, on the shore a tent and two young people sitting on a wooden jetty with their feet near the water, no text or signs",
  },
]);
