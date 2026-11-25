// Writes new Spanish A1 vocabulary categories (content/languages/es/vocabulary/*.json), Polish
// translations. Each line: "lemma|translation[|pos[:gender]][|note]". Nouns with el/la/los/las get
// their part of speech and gender from the article unless given. Ids are es-<slug>, prefixed with
// the category when the slug is taken.
//   node infrastructure/content-authoring/es-vocabulary-a1.mjs
import fs from "node:fs";

const DIR = "content/languages/es/vocabulary";
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^(el|la|los|las) /, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const NEW = [];
function category(id, order, title, description, lines) {
  NEW.push({ id, order, title, description, lines });
}

category("hotel", 160, "Hotel", "Rezerwacja, pokój i pobyt w hotelu.", [
  "la reserva|rezerwacja",
  "reservar|rezerwować",
  "la habitación|pokój",
  "la habitación individual|pokój jednoosobowy",
  "la habitación doble|pokój dwuosobowy",
  "la recepción|recepcja",
  "la llave|klucz",
  "el ascensor|winda",
  "la escalera|schody",
  "la planta|piętro|noun:feminine|W Hiszpanii mówi się też el piso.",
  "el desayuno|śniadanie",
  "desayuno incluido|śniadanie w cenie|phrase",
  "la cama|łóżko",
  "el baño|łazienka",
  "la ducha|prysznic",
  "la toalla|ręcznik",
  "el aire acondicionado|klimatyzacja",
  "la contraseña|hasło",
  "el equipaje|bagaż",
  "la maleta|walizka",
  "alojarse|zatrzymać się (w hotelu)|verb",
  "registrarse|zameldować się|verb",
  "dejar la habitación|wymeldować się (zwolnić pokój)|phrase",
  "el hostal|pensjonat, tani hotel",
  "el albergue|schronisko",
  "la piscina|basen",
  "las vistas al mar|widok na morze",
  "¿Tiene habitaciones libres?|Czy ma Pan/Pani wolne pokoje?|phrase",
  "Tengo una reserva a nombre de…|Mam rezerwację na nazwisko…|phrase",
  "¿A qué hora es el desayuno?|O której jest śniadanie?|phrase",
]);

category("travel", 170, "Podróże", "Lotnisko, dworzec, bilety i wakacje.", [
  "el viaje|podróż",
  "viajar|podróżować",
  "las vacaciones|wakacje, urlop",
  "el pasaporte|paszport",
  "el billete|bilet",
  "el billete de ida y vuelta|bilet w obie strony",
  "el aeropuerto|lotnisko",
  "el avión|samolot",
  "el vuelo|lot",
  "la puerta de embarque|wyjście do samolotu",
  "facturar la maleta|nadać bagaż|phrase",
  "la estación de tren|dworzec kolejowy",
  "el andén|peron",
  "el horario|rozkład jazdy",
  "llegar|przyjeżdżać, przylatywać",
  "salir|odjeżdżać, wylatywać",
  "el retraso|opóźnienie",
  "la playa|plaża",
  "la montaña|góry",
  "el turista|turysta|noun:masculine|Kobieta: la turista.",
  "la oficina de turismo|informacja turystyczna",
  "el mapa|mapa|noun:masculine|Rodzaj męski mimo końcówki -a.",
  "la excursión|wycieczka",
  "hacer la maleta|pakować walizkę|phrase",
  "en el extranjero|za granicą|phrase",
  "la frontera|granica",
  "alquilar un coche|wynająć samochód|phrase",
  "¡Buen viaje!|Szczęśliwej podróży!|phrase",
]);

category("professions", 180, "Zawody", "Zawody i praca: kto czym się zajmuje.", [
  "el profesor / la profesora|nauczyciel / nauczycielka|noun",
  "el médico / la médica|lekarz / lekarka|noun",
  "el enfermero / la enfermera|pielęgniarz / pielęgniarka|noun",
  "el camarero / la camarera|kelner / kelnerka|noun",
  "el cocinero / la cocinera|kucharz / kucharka|noun",
  "el ingeniero / la ingeniera|inżynier / inżynierka|noun",
  "el abogado / la abogada|prawnik / prawniczka|noun",
  "el dependiente / la dependienta|sprzedawca / sprzedawczyni|noun",
  "el conductor / la conductora|kierowca|noun",
  "el informático / la informática|informatyk / informatyczka|noun",
  "el peluquero / la peluquera|fryzjer / fryzjerka|noun",
  "el panadero / la panadera|piekarz / piekarka|noun",
  "el mecánico / la mecánica|mechanik|noun",
  "el arquitecto / la arquitecta|architekt / architektka|noun",
  "el funcionario / la funcionaria|urzędnik / urzędniczka|noun",
  "el empresario / la empresaria|przedsiębiorca|noun",
  "el / la periodista|dziennikarz / dziennikarka|noun:common",
  "el / la estudiante|student / studentka|noun:common",
  "el / la policía|policjant / policjantka|noun:common|La policía znaczy też „policja”.",
  "el / la dentista|dentysta / dentystka|noun:common",
  "el / la taxista|taksówkarz / taksówkarka|noun:common",
  "la empresa|firma",
  "la oficina|biuro",
  "trabajar en…|pracować w…|phrase",
  "estar en paro|być bezrobotnym|phrase",
  "estar jubilado|być na emeryturze|phrase",
  "¿A qué te dedicas?|Czym się zajmujesz?|phrase",
]);

category("food-and-drink", 190, "Jedzenie i napoje", "Produkty spożywcze i posiłki.", [
  "el pan|chleb",
  "la leche|mleko",
  "el agua|woda|noun:feminine|Rodzaj żeński, ale el agua (agua fría).",
  "el zumo|sok",
  "el té|herbata",
  "la cerveza|piwo",
  "el vino|wino",
  "el queso|ser",
  "el jamón|szynka",
  "el huevo|jajko",
  "la carne|mięso",
  "el pollo|kurczak",
  "la fruta|owoce",
  "la manzana|jabłko",
  "la naranja|pomarańcza",
  "el plátano|banan",
  "la verdura|warzywa",
  "la patata|ziemniak|noun:feminine|W Ameryce Łacińskiej: la papa.",
  "el tomate|pomidor",
  "la cebolla|cebula",
  "el arroz|ryż",
  "la pasta|makaron",
  "el aceite de oliva|oliwa z oliwek",
  "la sal|sól",
  "el azúcar|cukier",
  "la comida|jedzenie; obiad",
  "la cena|kolacja",
  "tener hambre|być głodnym|phrase",
  "tener sed|chcieć pić|phrase",
]);

category("body", 200, "Ciało", "Części ciała.", [
  "la cabeza|głowa",
  "la cara|twarz",
  "el ojo|oko",
  "la nariz|nos",
  "la boca|usta",
  "el diente|ząb",
  "la oreja|ucho",
  "el cuello|szyja",
  "la espalda|plecy",
  "el brazo|ramię, ręka (cała)",
  "la mano|dłoń, ręka|noun:feminine|Rodzaj żeński mimo -o: la mano.",
  "el dedo|palec",
  "el estómago|żołądek, brzuch",
  "la pierna|noga",
  "la rodilla|kolano",
  "el pie|stopa",
  "el corazón|serce",
  "la garganta|gardło",
]);

category("calendar", 210, "Czas i kalendarz", "Dni tygodnia, miesiące i pory roku.", [
  "el lunes|poniedziałek",
  "el martes|wtorek",
  "el miércoles|środa",
  "el jueves|czwartek",
  "el viernes|piątek",
  "el sábado|sobota",
  "el domingo|niedziela",
  "enero|styczeń|noun:masculine",
  "febrero|luty|noun:masculine",
  "marzo|marzec|noun:masculine",
  "abril|kwiecień|noun:masculine",
  "mayo|maj|noun:masculine",
  "junio|czerwiec|noun:masculine",
  "julio|lipiec|noun:masculine",
  "agosto|sierpień|noun:masculine",
  "septiembre|wrzesień|noun:masculine",
  "octubre|październik|noun:masculine",
  "noviembre|listopad|noun:masculine",
  "diciembre|grudzień|noun:masculine",
  "la primavera|wiosna",
  "el verano|lato",
  "el otoño|jesień",
  "el invierno|zima",
  "la semana|tydzień",
  "el fin de semana|weekend",
  "el mes|miesiąc",
  "el año|rok",
  "la hora|godzina",
  "el minuto|minuta",
]);

category(
  "adjectives",
  220,
  "Najczęstsze przymiotniki",
  "Pary przymiotników do opisu rzeczy i ludzi.",
  [
    "grande|duży|adjective",
    "pequeño|mały|adjective",
    "nuevo|nowy|adjective",
    "viejo|stary|adjective",
    "bueno|dobry|adjective",
    "malo|zły|adjective",
    "caro|drogi|adjective",
    "barato|tani|adjective",
    "fácil|łatwy|adjective",
    "difícil|trudny|adjective",
    "bonito|ładny|adjective",
    "feo|brzydki|adjective",
    "rápido|szybki|adjective",
    "lento|wolny, powolny|adjective",
    "limpio|czysty|adjective",
    "sucio|brudny|adjective",
    "abierto|otwarty|adjective",
    "cerrado|zamknięty|adjective",
    "lleno|pełny|adjective",
    "vacío|pusty|adjective",
    "caliente|gorący|adjective",
    "frío|zimny|adjective",
    "interesante|ciekawy|adjective",
    "aburrido|nudny; znudzony|adjective",
    "importante|ważny|adjective",
    "cansado|zmęczony|adjective",
    "contento|zadowolony|adjective",
    "triste|smutny|adjective",
    "ocupado|zajęty|adjective",
    "libre|wolny (niezajęty)|adjective",
  ],
);

const taken = new Set();
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
  if (NEW.some((c) => c.id === j.id)) continue;
  for (const item of j.items) taken.add(item.id);
}

const POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "numeral",
  "preposition",
  "conjunction",
  "interjection",
  "particle",
  "phrase",
]);
for (const c of NEW) {
  const items = c.lines.map((line, i) => {
    const [lemma, translation, posField, note] = line.split("|");
    let [pos, gender] = (posField ?? "").split(":");
    const article = /^(el|la|los|las) /.exec(lemma)?.[1];
    if (!pos)
      pos = article
        ? "noun"
        : /^[a-záéíóúñ]+(ar|er|ir|arse|erse|irse)$/.test(lemma)
          ? "verb"
          : "phrase";
    if (!POS.has(pos)) throw new Error(`bad pos ${pos} in ${line}`);
    if (pos === "noun" && !gender && article && !lemma.includes(" / "))
      gender = article === "el" || article === "los" ? "masculine" : "feminine";
    let id = `es-${slug(lemma)}`;
    if (taken.has(id)) id = `es-${c.id}-${slug(lemma)}`;
    if (taken.has(id)) throw new Error(`duplicate id ${id}`);
    taken.add(id);
    return {
      id,
      status: "published",
      order: (i + 1) * 10,
      lemma,
      translation,
      levelId: "a1",
      partOfSpeech: pos,
      ...(gender ? { gender } : {}),
      ...(note ? { note } : {}),
    };
  });
  const file = {
    schemaVersion: 1,
    id: c.id,
    languageId: "es",
    status: "published",
    order: c.order,
    instructionLanguage: "pl",
    title: c.title,
    description: c.description,
    items,
  };
  fs.writeFileSync(`${DIR}/${c.id}.json`, `${JSON.stringify(file, null, 2)}\n`);
  console.log(c.id, items.length);
}
