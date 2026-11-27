// Polish for Spanish speakers — A1 unit 3B (Jak dojść do…?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-3b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(3, "pl-es-unit-3-directions", 3500, COURSE);
// PERCIBIR
k.tf(
  "pl-es-u3b-listen-far",
  "perceive",
  "Diálogo: la calle Floriańska está muy lejos.",
  "To niedaleko — andando son unos diez minutos.",
  false,
);
k.mc(
  "pl-es-u3b-listen-first",
  "perceive",
  "Diálogo: ¿qué tiene que hacer Javier primero?",
  "Proszę iść prosto do końca tej ulicy.",
  ["Ir recto hasta el final de la calle.", "Girar a la derecha.", "Coger el tranvía."],
);
k.mc(
  "pl-es-u3b-listen-crossing",
  "perceive",
  "Diálogo: ¿qué hace en el cruce?",
  "Na skrzyżowaniu proszę skręcić w lewo.",
  ["Gira a la izquierda.", "Gira a la derecha.", "Cruza el puente."],
);
k.mc(
  "pl-es-u3b-listen-mistake",
  "perceive",
  "Diálogo: ¿en qué se equivoca Javier al repetir?",
  "Dice druga ulica w lewo, pero es druga w prawo.",
  [
    "Dice izquierda en vez de derecha.",
    "Dice tercera en vez de segunda.",
    "Dice tranvía en vez de autobús.",
  ],
);
k.mc(
  "pl-es-u3b-listen-tram",
  "perceive",
  "Diálogo: ¿qué tranvías van al centro?",
  "Dwójka albo czwórka — el 2 o el 4.",
  ["El 2 o el 4.", "El 5.", "El 12."],
);
// CONECTAR
k.match(
  "pl-es-u3b-match-directions",
  "connect",
  "Une cada indicación con su traducción.",
  "Na światłach = en el semáforo; za rogiem = a la vuelta de la esquina.",
  [
    ["prosto", "recto"],
    ["w lewo", "a la izquierda"],
    ["na skrzyżowaniu", "en el cruce"],
    ["na światłach", "en el semáforo"],
    ["za rogiem", "a la vuelta de la esquina"],
    ["przez most", "cruzando el puente"],
  ],
);
k.match(
  "pl-es-u3b-match-transport",
  "connect",
  "Une cada vehículo con su forma en instrumental.",
  "Masculino y neutro -em; femenino -ą.",
  [
    ["autobus", "autobusem"],
    ["pociąg", "pociągiem"],
    ["taksówka", "taksówką"],
    ["metro", "metrem"],
  ],
);
k.mc(
  "pl-es-u3b-swiatla",
  "connect",
  "¿Qué significa literalmente światła (el semáforo)?",
  "Światła = las luces.",
  ["Las luces.", "La cruz.", "La esquina."],
);
k.mc(
  "pl-es-u3b-skasowac",
  "connect",
  "Subes al tranvía con un billete de papel. ¿Qué tienes que hacer?",
  "Skasować bilet = validarlo en la máquina del vehículo.",
  ["Skasować bilet.", "Kupić przesiadkę.", "Wysiadać."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u3b-gap-isc-jechac",
  "structure",
  "Completa con idę o jadę.",
  "A pie: idę; en vehículo: jadę.",
  "Do sklepu ___ pieszo, do pracy ___ tramwajem, a do Gdańska ___ pociągiem.",
  [["idę"], ["jadę"], ["jadę"]],
);
k.gap(
  "pl-es-u3b-gap-conj",
  "structure",
  "Completa con la forma de iść o jechać.",
  "Ty idziesz; oni jadą; my idziemy.",
  "Dokąd ___ (iść, ty)? Moi rodzice ___ (jechać) do Krakowa. My ___ (iść) do kina.",
  [["idziesz"], ["jadą"], ["idziemy"]],
);
k.mc(
  "pl-es-u3b-warszawa",
  "structure",
  "Vives en Cracovia y vas a Varsovia el fin de semana. ¿Qué dices?",
  "Entre ciudades: jechać + do + genitivo.",
  ["Jadę do Warszawy.", "Idę do Warszawy.", "Jadę w Warszawie."],
);
k.gap(
  "pl-es-u3b-gap-do",
  "structure",
  "Completa con do + genitivo.",
  "Bank → do banku; apteka → do apteki; kino → do kina.",
  "Idę do ___ (bank), potem do ___ (apteka), a wieczorem do ___ (kino).",
  [["banku"], ["apteki"], ["kina"]],
);
k.mc(
  "pl-es-u3b-gdzie-dokad",
  "structure",
  "— Dokąd idziesz? ¿Qué respuesta encaja?",
  "Dokąd? → do + genitivo. Gdzie? → w + locativo.",
  ["Do apteki.", "W aptece.", "Apteka."],
);
k.mc(
  "pl-es-u3b-instrumental",
  "structure",
  "¿Cuál es correcto?",
  "El vehículo va en instrumental, sin preposición.",
  ["Jadę do pracy autobusem.", "Jadę do pracy w autobusie.", "Idę do pracy autobus."],
);
k.mc(
  "pl-es-u3b-formal",
  "structure",
  "Un turista mayor te pregunta el camino. ¿Cómo le dices «gire a la derecha»?",
  "Formal: proszę + infinitivo.",
  ["Proszę skręcić w prawo.", "Skręć w prawo.", "Skręcić prawo."],
);
k.mc(
  "pl-es-u3b-informal",
  "structure",
  "Explicas el camino a un amigo. ¿Cómo le dices «sigue recto»?",
  "Informal: imperativo idź.",
  ["Idź prosto.", "Proszę iść prosto, pan.", "Idziesz w prosto."],
);
k.gap(
  "pl-es-u3b-gap-ordinals",
  "structure",
  "Completa con el ordinal femenino (ulica es femenino) después de na.",
  "Druga ulica, pero na + locativo: na pierwszej ulicy, na trzeciej ulicy.",
  "Bank jest na ___ (1) ulicy w prawo, a poczta na ___ (3) ulicy w lewo.",
  [["pierwszej"], ["trzeciej"]],
);
k.order(
  "pl-es-u3b-order-instructions",
  "structure",
  "Ordena: Siga recto y luego gire a la izquierda.",
  "Proszę iść prosto + a potem skręcić w lewo.",
  ["Proszę", "iść", "prosto,", "a", "potem", "skręcić", "w", "lewo."],
);
k.order(
  "pl-es-u3b-order-question",
  "structure",
  "Ordena: ¿Qué tranvía va al centro?",
  "Który tramwaj + jedzie + do centrum?",
  ["Który", "tramwaj", "jedzie", "do", "centrum?"],
);
// SONAR
k.mc(
  "pl-es-u3b-sound-czy",
  "sound",
  "¿Cómo termina la melodía de Czy to daleko?",
  "Pregunta de sí o no: sube al final.",
  ["Sube al final.", "Baja al final.", "Es plana."],
);
k.mc(
  "pl-es-u3b-sound-jak",
  "sound",
  "¿Cómo termina la melodía de Jak dojść do dworca?",
  "Pregunta con palabra interrogativa: baja al final.",
  ["Baja al final.", "Sube al final.", "Sube y baja dos veces."],
);
k.tf(
  "pl-es-u3b-sound-czyli",
  "sound",
  "Para confirmar una indicación (Czyli druga w prawo?) la voz sube al final.",
  "Sí: es una pregunta de confirmación, como las de sí o no.",
  true,
);
// CULTURA
k.mc(
  "pl-es-u3b-reading-tram",
  "culture",
  "Lectura: ¿qué tranvía coge Javier en la estación?",
  "Jedziesz piątką — el cinco.",
  ["El cinco.", "El dos.", "El cuatro."],
);
k.mc(
  "pl-es-u3b-reading-stop",
  "culture",
  "Lectura: ¿en qué parada se baja?",
  "Wysiadasz na czwartym przystanku.",
  ["En la cuarta.", "En la segunda.", "En la última."],
);
k.mc(
  "pl-es-u3b-reading-flat",
  "culture",
  "Lectura: ¿dónde está el bloque de Tomek?",
  "Mój blok jest za sklepem, naprzeciwko małego parku.",
  [
    "Detrás de una tienda, enfrente de un parque.",
    "Al lado de la estación.",
    "Enfrente de una iglesia.",
  ],
);
k.tf(
  "pl-es-u3b-culture-metro",
  "culture",
  "Cultura: Cracovia y Varsovia tienen metro.",
  "Solo Varsovia tiene metro; en Cracovia y casi todas las grandes ciudades el transporte principal es el tranvía.",
  false,
);
k.mc(
  "pl-es-u3b-culture-tram-number",
  "culture",
  "Cultura: un polaco dice czekam na piątkę en la parada. ¿Qué espera?",
  "Las líneas se nombran en femenino: piątka = la línea cinco.",
  ["El tranvía o autobús número cinco.", "A cinco amigos.", "Las cinco en punto."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u3b-translate-how",
  "transform",
  "Escribe en polaco: Perdone, señora, ¿cómo se llega a la estación (a pie)?",
  "Przepraszam panią + jak dojść do dworca?",
  ["Przepraszam panią, jak dojść do dworca?", "Przepraszam, jak dojść do dworca?"],
);
k.ta(
  "pl-es-u3b-translate-left",
  "transform",
  "Escribe en polaco (formal): Gire a la izquierda en el semáforo.",
  "Proszę skręcić w lewo + na światłach.",
  ["Proszę skręcić w lewo na światłach.", "Na światłach proszę skręcić w lewo."],
);
k.ta(
  "pl-es-u3b-translate-tram",
  "transform",
  "Escribe en polaco: Voy al trabajo en tranvía.",
  "Jadę (vehículo) do pracy (genitivo) tramwajem (instrumental).",
  ["Jadę do pracy tramwajem.", "Jadę tramwajem do pracy."],
);
k.ta(
  "pl-es-u3b-translate-walk",
  "transform",
  "Escribe en polaco: Vamos al parque andando.",
  "Idziemy do parku pieszo.",
  ["Idziemy do parku pieszo.", "Idziemy pieszo do parku.", "Idziemy do parku na piechotę."],
);
k.ta(
  "pl-es-u3b-translate-second",
  "transform",
  "Escribe en polaco: La segunda calle a la derecha.",
  "Ordinal femenino: druga ulica w prawo.",
  ["Druga ulica w prawo."],
);
// EXPRESAR
k.write(
  "pl-es-u3b-write-way",
  "express",
  "Un amigo polaco llega en tren a tu ciudad. Escríbele cómo llegar desde la estación hasta tu casa: transporte, parada y al menos tres indicaciones a pie.",
  "Revisa: jedziesz + instrumental, wysiadasz na…, idziesz prosto, skręcasz w prawo / w lewo, druga ulica…",
  "Cześć, Ania! Na dworcu idziesz na przystanek autobusowy. Jedziesz autobusem numer dwadzieścia trzy. Wysiadasz na piątym przystanku, obok dużego parku. Potem idziesz prosto do końca ulicy i na światłach skręcasz w prawo. Mój blok jest na rogu, naprzeciwko apteki. Mieszkam na drugim piętrze. Do zobaczenia!",
  ["transporte", "parada", "tres indicaciones", "dónde está tu casa"],
  30,
  90,
  7,
);
k.write(
  "pl-es-u3b-write-commute",
  "express",
  "Explica cómo vas cada día al trabajo (o a donde vayas): a pie o en qué transporte, cuánto tardas y qué ves por el camino.",
  "Iść o jechać según el caso, do + genitivo, el vehículo en instrumental.",
  "Codziennie jadę do pracy tramwajem. Przystanek jest blisko, pięć minut pieszo. Jadę dwadzieścia minut. Potem idę przez park i jestem w biurze. W piątek czasami jadę rowerem.",
  ["cómo vas", "cuánto tardas", "camino"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 3 (pl-es) total", renumber(3, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u3-street.png",
    prompt:
      "an older man wearing a hat points down a street of colourful old townhouses to a young man who listens attentively, a modern tram passes in the background, sunny afternoon",
  },
]);
