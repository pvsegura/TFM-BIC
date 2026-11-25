// Unit 3 workbook exercises (3A places, 3B directions) and illustrations.
//   node infrastructure/content-authoring/a1-unit-3.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const a = kit(3, "es-unit-3-places", 300);
a.mc(
  "es-u3a-listen-pharmacy",
  "perceive",
  "Dialog: gdzie jest apteka?",
  "Está muy cerca, al lado del banco.",
  ["Obok banku.", "Naprzeciwko kościoła.", "Na dworcu."],
);
a.tf(
  "es-u3a-listen-atm",
  "perceive",
  "Dialog: w okolicy jest tylko jeden bankomat.",
  "Hay uno en el banco y otro enfrente del museo — są dwa.",
  false,
);
a.mc(
  "es-u3a-listen-museum",
  "perceive",
  "Dialog: gdzie jest muzeum?",
  "En la plaza, entre el ayuntamiento y la iglesia.",
  ["Na placu, między ratuszem a kościołem.", "Na ulicy Mayor, obok apteki.", "Daleko, za parkiem."],
);
a.match(
  "es-u3a-match-places",
  "connect",
  "Połącz miejsca z tłumaczeniem.",
  "Ayuntamiento = ratusz; librería = księgarnia (biblioteka to biblioteca).",
  [
    ["el ayuntamiento", "ratusz"],
    ["la librería", "księgarnia"],
    ["la biblioteca", "biblioteka"],
    ["correos", "poczta"],
    ["el cajero automático", "bankomat"],
  ],
);
a.match(
  "es-u3a-match-position",
  "connect",
  "Połącz wyrażenia położenia.",
  "Detrás de = za; delante de = przed; en la esquina = na rogu.",
  [
    ["detrás de", "za"],
    ["delante de", "przed"],
    ["en la esquina", "na rogu"],
    ["lejos de", "daleko od"],
  ],
);
a.mc(
  "es-u3a-hay-esta-1",
  "structure",
  "Uzupełnij: En mi calle ___ dos panaderías.",
  "Mówimy, że coś istnieje (dwie piekarnie) → hay.",
  ["hay", "están", "es"],
);
a.mc(
  "es-u3a-hay-esta-2",
  "structure",
  "Uzupełnij: La panadería ___ en la esquina.",
  "Konkretna, znana piekarnia (la) → está.",
  ["está", "hay", "es"],
);
a.gap(
  "es-u3a-gap-contractions",
  "structure",
  "Uzupełnij: obok banku i naprzeciwko apteki.",
  "De + el = del; z la bez zmian: de la.",
  "al lado ___ banco y enfrente ___ farmacia",
  [["del"], ["de la"]],
);
a.order(
  "es-u3a-order-question",
  "structure",
  "Ułóż pytanie: Czy jest tu gdzieś przystanek autobusowy?",
  "Pytanie o istnienie z hay; por aquí = gdzieś tutaj.",
  ["¿Hay", "una", "parada", "de", "autobús", "por", "aquí?"],
);
a.mc(
  "es-u3a-estar-form",
  "structure",
  "Uzupełnij: —¿Dónde ___? —Estamos en la plaza.",
  "Pytanie do was (vosotros): estáis.",
  ["estáis", "están", "estamos"],
);
a.tf(
  "es-u3a-sound-plaza",
  "sound",
  "W większości Hiszpanii plaza wymawia się [plaθa], a w Ameryce Łacińskiej [plasa].",
  "Tak — obie wymowy są poprawne; nigdy jak polskie [plaza].",
  true,
);
a.mc(
  "es-u3a-reading-barrio",
  "culture",
  "Czytanka: jaki jest barrio del Carmen?",
  "Es un barrio antiguo, con calles estrechas y muchas plazas pequeñas.",
  [
    "Stary, z wąskimi uliczkami i małymi placami.",
    "Nowoczesny, z szerokimi alejami.",
    "Daleko od centrum, przy plaży.",
  ],
);
a.tf(
  "es-u3a-reading-shops",
  "culture",
  "Czytanka: sklepy w dzielnicy Lucíi są otwarte bez przerwy od rana do wieczora.",
  "Las tiendas cierran a mediodía y abren otra vez por la tarde.",
  false,
);
a.ta(
  "es-u3a-translate-pharmacy",
  "transform",
  "Napisz po hiszpańsku: Apteka jest naprzeciwko kościoła.",
  "Konkretna apteka → está; naprzeciwko = enfrente de.",
  ["La farmacia está enfrente de la iglesia."],
);
a.ta(
  "es-u3a-translate-many-bars",
  "transform",
  "Napisz po hiszpańsku: W mojej dzielnicy jest dużo barów.",
  "Istnienie → hay; muchos bares.",
  ["En mi barrio hay muchos bares.", "Hay muchos bares en mi barrio."],
);
a.write(
  "es-u3a-write-barrio",
  "express",
  "Opisz swoją okolicę w 5–6 zdaniach: co w niej jest i gdzie dokładnie się znajduje.",
  "Sprawdź: hay dla rzeczy nowych, está dla konkretnych; al/del.",
  "Vivo en un barrio tranquilo cerca del centro. En mi calle hay una panadería y un supermercado. El supermercado está al lado de mi casa. Hay un parque grande enfrente del colegio. La parada de autobús está en la esquina.",
  [
    "co najmniej dwa zdania z hay",
    "co najmniej dwa zdania z está",
    "wyrażenia położenia",
    "del / al tam, gdzie trzeba",
  ],
  25,
  90,
  7,
);
console.log("3A", a.save());

const b = kit(3, "es-unit-3-directions", 300);
b.mc(
  "es-u3b-listen-where",
  "perceive",
  "Dialog: gdzie jest Ania, gdy dzwoni do Carlosa?",
  "Estoy en la salida del metro, en la plaza de Lavapiés.",
  ["Przy wyjściu z metra na placu Lavapiés.", "Na lotnisku.", "Przed domem Carlosa."],
);
b.mc(
  "es-u3b-listen-way",
  "perceive",
  "Dialog: jak Ania ma dojść do domu?",
  "Sigues todo recto y tomas la segunda a la izquierda.",
  [
    "Prosto, potem w drugą w lewo.",
    "W prawo, potem prosto do końca.",
    "Przez plac i w pierwszą w prawo.",
  ],
);
b.tf(
  "es-u3b-listen-floor",
  "perceive",
  "Dialog: Carlos mieszka na trzecim piętrze, drzwi B.",
  "Tercero B.",
  true,
);
b.match(
  "es-u3b-match-directions",
  "connect",
  "Połącz wskazówki z tłumaczeniem.",
  "Cruzar = przechodzić przez; el semáforo = światła.",
  [
    ["sigues todo recto", "idziesz prosto"],
    ["giras a la izquierda", "skręcasz w lewo"],
    ["cruzas la plaza", "przechodzisz przez plac"],
    ["en el semáforo", "na światłach"],
    ["al final de la calle", "na końcu ulicy"],
  ],
);
b.match(
  "es-u3b-match-building",
  "connect",
  "Połącz słowa związane z budynkiem.",
  "Portal = wejście do budynku; el bajo = parter.",
  [
    ["el portal", "wejście do budynku"],
    ["el bajo", "parter"],
    ["el timbre", "dzwonek"],
    ["la dirección", "adres"],
  ],
);
b.mc(
  "es-u3b-ordinal",
  "structure",
  "Uzupełnij: Vivo en el ___ piso.",
  "Przed rzeczownikiem męskim tercero → tercer.",
  ["tercer", "tercero", "tercera"],
);
b.mc(
  "es-u3b-ordinal-fem",
  "structure",
  "Uzupełnij: Tomas la ___ calle a la derecha.",
  "Liczebnik zgadza się z rzeczownikiem żeńskim: la segunda.",
  ["segunda", "segundo", "dos"],
);
b.mc(
  "es-u3b-ser-estar-closed",
  "structure",
  "Uzupełnij: Hoy es domingo y el supermercado ___ cerrado.",
  "Stan chwilowy → estar.",
  ["está", "es", "hay"],
);
b.mc(
  "es-u3b-ser-estar-city",
  "structure",
  "Uzupełnij: Sevilla ___ una ciudad muy bonita.",
  "Stała cecha miejsca → ser.",
  ["es", "está", "hay"],
);
b.gap(
  "es-u3b-gap-way",
  "structure",
  "Uzupełnij wskazówki: Idziesz prosto i skręcasz w prawo.",
  "Czas teraźniejszy, 2. osoba: sigues, giras.",
  "___ todo recto y ___ a la derecha.",
  [["sigues"], ["giras"]],
);
b.order(
  "es-u3b-order-how",
  "structure",
  "Ułóż pytanie: Jak dojdę do dworca?",
  "¿Cómo llego a…? a + la estación.",
  ["¿Cómo", "llego", "a", "la", "estación?"],
);
b.order(
  "es-u3b-order-address",
  "structure",
  "Ułóż adres w hiszpańskiej kolejności.",
  "Ulica, numer, piętro i drzwi.",
  ["Calle", "Mayor,", "8,", "2.º", "A"],
);
b.tf(
  "es-u3b-sound-llegais",
  "sound",
  "W formie llegáis akcent pada na przedostatnią sylabę, jak w llegas.",
  "Forma vosotros ma akcent na końcówce: lle-GÁIS.",
  false,
);
b.mc(
  "es-u3b-reading-metro",
  "culture",
  "Czytanka: na jakiej linii metra wsiada się na lotnisku?",
  "Tomas la línea 8 del metro hasta Nuevos Ministerios.",
  ["Na linii 8.", "Na linii 3.", "Na linii 10."],
);
b.tf(
  "es-u3b-reading-portal",
  "culture",
  "Czytanka: wejście do budynku Carlosa jest naprzeciwko baru z dużym ogródkiem.",
  "El portal está enfrente de un bar con una terraza grande.",
  true,
);
b.ta(
  "es-u3b-translate-far",
  "transform",
  "Napisz po hiszpańsku: Czy muzeum jest daleko?",
  "Położenie → estar: ¿Está lejos el museo?",
  ["¿Está lejos el museo?", "¿El museo está lejos?", "Está lejos el museo"],
);
b.ta(
  "es-u3b-translate-minutes",
  "transform",
  "Napisz po hiszpańsku: To dziesięć minut pieszo.",
  "Odległość w minutach: está a… minutos a pie.",
  ["Está a diez minutos a pie."],
);
b.write(
  "es-u3b-write-way",
  "express",
  "Napisz wiadomość do znajomego: jak dojść od stacji metra do twojego domu (adres, 4–5 kroków, punkty orientacyjne).",
  "Sprawdź liczebniki porządkowe (primer, segunda) i formy sigues/giras/cruzas.",
  "¡Hola! Mi dirección es calle de la Paz, 12, 1.º A. Sales del metro y giras a la derecha. Sigues todo recto hasta el semáforo. Cruzas la calle y tomas la primera a la izquierda. Mi portal está enfrente de una farmacia. Está a cinco minutos a pie.",
  [
    "adres z piętrem i drzwiami",
    "co najmniej trzy kroki drogi",
    "punkt orientacyjny",
    "czas pieszo",
  ],
  25,
  100,
  8,
);
console.log("3B", b.save(), "unit 3 total", renumber(3));

planImages([
  {
    asset: "a1-u3-street-ask.png",
    prompt:
      "a young female tourist with a backpack asks an older local man for directions on a sunny old-town street with small shops, café tables and balconies, no signs",
  },
  {
    asset: "a1-u3-plaza.png",
    prompt:
      "the main square of a Spanish town with arcades, café terraces with umbrellas, a town hall building with a clock tower and people walking, no signs",
  },
  {
    asset: "a1-u3-building.png",
    prompt:
      "a woman with a suitcase standing at the entrance door of an old apartment building, pressing an intercom with plain buttons, balconies above",
  },
]);
