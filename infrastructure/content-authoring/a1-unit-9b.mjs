// Spanish for Polish speakers — A1 unit 9B (¿Qué vas a hacer en vacaciones?) exercises.
//   node infrastructure/content-authoring/a1-unit-9b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const b = kit(9, "es-unit-9-holidays", 300);
// PERCIBIR
b.mc(
  "es-u9b-listen-lucia",
  "perceive",
  "Dialog: dokąd jedzie Lucía?",
  "Pienso ir a Polonia en agosto: Cracovia y Gdansk.",
  ["Do Polski: Kraków i Gdańsk.", "Do Andaluzji.", "Do Meksyku."],
);
b.mc(
  "es-u9b-listen-transport",
  "perceive",
  "Dialog: jak Lucía dostanie się do Gdańska?",
  "Voy a volar a Cracovia y después voy a ir en tren a Gdansk.",
  ["Pociągiem z Krakowa.", "Samolotem z Madrytu.", "Samochodem."],
);
b.mc(
  "es-u9b-listen-sleep",
  "perceive",
  "Dialog: gdzie Lucía będzie spać w Gdańsku?",
  "En un apartamento cerca de la playa.",
  ["W apartamencie blisko plaży.", "W hotelu w centrum.", "W schronisku."],
);
b.tf(
  "es-u9b-listen-baltic",
  "perceive",
  "Dialog: według Marka Bałtyk jest ciepły.",
  "El Báltico está frío: a unos dieciocho grados.",
  false,
);
b.mc(
  "es-u9b-listen-marek",
  "perceive",
  "Dialog: co Marek będzie robić w Andaluzji po południu?",
  "Por la tarde vamos a descansar en la piscina.",
  ["Odpoczywać na basenie.", "Zwiedzać zabytki.", "Pracować."],
);
// CONECTAR
b.match(
  "es-u9b-match-travel",
  "connect",
  "Połącz słowa z tłumaczeniem.",
  "La maleta = walizka; el billete de ida y vuelta = bilet w obie strony.",
  [
    ["la maleta", "walizka"],
    ["el billete de ida y vuelta", "bilet w obie strony"],
    ["el aeropuerto", "lotnisko"],
    ["volar", "lecieć"],
    ["el albergue", "schronisko, hostel"],
    ["la reserva", "rezerwacja"],
  ],
);
b.match(
  "es-u9b-match-activities",
  "connect",
  "Połącz czynności z tłumaczeniem.",
  "Tomar el sol = opalać się; bañarse = kąpać się.",
  [
    ["tomar el sol", "opalać się"],
    ["bañarse", "kąpać się"],
    ["visitar monumentos", "zwiedzać zabytki"],
    ["descansar", "odpoczywać"],
  ],
);
b.mc(
  "es-u9b-pueblo",
  "connect",
  "Hiszpan mówi: En agosto voy al pueblo. Co to zwykle znaczy?",
  "El pueblo = rodzinna miejscowość rodziców albo dziadków.",
  ["Jedzie do rodzinnej miejscowości.", "Jedzie do dużego miasta.", "Jedzie za granicę."],
);
b.mc(
  "es-u9b-vacaciones",
  "connect",
  "Które jest poprawne?",
  "Vacaciones zawsze w liczbie mnogiej.",
  ["las vacaciones", "la vacación", "el vacaciones"],
);
// ESTRUCTURAR
b.gap(
  "es-u9b-gap-plans",
  "structure",
  "Uzupełnij: a albo de.",
  "Ir a + bezokolicznik; pensar + bezokolicznik; tener ganas de + bezokolicznik.",
  "Voy ___ viajar a Gdansk y tengo ganas ___ ver el mar.",
  [["a"], ["de"]],
);
b.mc(
  "es-u9b-pienso",
  "structure",
  "Które zdanie jest poprawne?",
  "Pensar + bezokolicznik, bez a.",
  ["Pienso ir a la playa.", "Pienso a ir a la playa.", "Pienso de ir a la playa."],
);
b.mc(
  "es-u9b-gustaria",
  "structure",
  "Marzysz o podróży do Meksyku. Co mówisz?",
  "Marzenie: me gustaría + bezokolicznik.",
  ["Me gustaría viajar a México.", "Me gusta viajar a México.", "Yo gustaría viajar a México."],
);
b.mc(
  "es-u9b-gustaria-te",
  "structure",
  "Jak zapytasz: „Chciałbyś pojechać do Polski?”",
  "Me gustaría działa jak gustar: ¿te gustaría…?",
  ["¿Te gustaría ir a Polonia?", "¿Gustarías ir a Polonia?", "¿Tú gustaría ir a Polonia?"],
);
b.gap(
  "es-u9b-gap-prepositions",
  "structure",
  "Uzupełnij przyimkiem: a, en, de.",
  "Dokąd: a; gdzie: en; skąd: de; czym: en.",
  "Salgo ___ Madrid, viajo ___ avión, llego ___ Cracovia y duermo ___ un hotel.",
  [["de"], ["en"], ["a"], ["en"]],
);
b.mc("es-u9b-llego-a", "structure", "Które zdanie jest poprawne?", "Llegar a + miejsce.", [
  "Llego a Madrid a las doce.",
  "Llego en Madrid a las doce.",
  "Llego para Madrid a las doce.",
]);
b.mc(
  "es-u9b-en-tren",
  "structure",
  "Jak powiesz „Jadę pociągiem z przyjaciółmi”?",
  "Pojazd: en; towarzystwo: con.",
  [
    "Viajo en tren con mis amigos.",
    "Viajo con tren en mis amigos.",
    "Viajo con tren con mis amigos.",
  ],
);
b.gap(
  "es-u9b-gap-isimo",
  "structure",
  "Uzupełnij formą na -ísimo.",
  "Caro → carísimo; mucho → muchísimo; bonita → bonitísima.",
  "El hotel es ___ (caro), hace ___ (mucho) calor, pero la ciudad es ___ (bonita).",
  [["carísimo"], ["muchísimo"], ["bonitísima"]],
);
b.mc(
  "es-u9b-muy-mucho",
  "structure",
  "Uzupełnij: El tren es ___ cómodo y hay ___ gente.",
  "Muy przed przymiotnikiem; mucha przed rzeczownikiem żeńskim.",
  ["muy / mucha", "mucho / muy", "muy / muy"],
);
b.order(
  "es-u9b-order-plan",
  "structure",
  "Ułóż: Zamierzam pojechać do Polski w sierpniu.",
  "Pienso ir + a Polonia + en agosto.",
  ["Pienso", "ir", "a", "Polonia", "en", "agosto."],
);
b.order(
  "es-u9b-order-dream",
  "structure",
  "Ułóż: Chciałabym poznać Grenadę.",
  "Me gustaría + conocer + Granada.",
  ["Me", "gustaría", "conocer", "Granada."],
);
// SONAR
b.mc(
  "es-u9b-sound-en-polonia",
  "sound",
  "Jak naturalnie brzmi en Polonia?",
  "N przed p brzmi jak m: [em polonia].",
  ["[em polonia]", "[en polonia] z mocnym n", "[e polonia]"],
);
b.tf(
  "es-u9b-sound-un-beso",
  "sound",
  "W un beso n brzmi jak m: [um beso].",
  "Tak: przed b, v, p, m n zmienia się w m.",
  true,
);
b.mc(
  "es-u9b-sound-en-casa",
  "sound",
  "Jak brzmi n w en casa?",
  "Przed k (c) — jak polskie n w „bank”: [eŋ kasa].",
  ["Jak n w „bank”.", "Jak m.", "Nie słychać go."],
);
// CULTURA
b.mc(
  "es-u9b-reading-arrival",
  "culture",
  "Lectura: o której Lucía przylatuje do Krakowa?",
  "Sale a las ocho y llega a Cracovia a las doce.",
  ["O dwunastej.", "O ósmej.", "O piętnastej."],
);
b.mc(
  "es-u9b-reading-train",
  "culture",
  "Lectura: ile trwa podróż pociągiem do Gdańska?",
  "El viaje dura unas cinco horas.",
  ["Około pięciu godzin.", "Dwie godziny.", "Cały dzień."],
);
b.tf(
  "es-u9b-reading-return",
  "culture",
  "Lectura: Lucía wraca do Madrytu 15 sierpnia.",
  "El quince de agosto vuelve a Madrid.",
  true,
);
b.mc(
  "es-u9b-culture-august",
  "culture",
  "Kultura: co dzieje się w Madrycie w sierpniu?",
  "Wiele firm i sklepów się zamyka, miasto pustoszeje.",
  ["Miasto pustoszeje, ludzie wyjeżdżają.", "Jest najwięcej pracy.", "Zaczyna się rok szkolny."],
);
// TRANSFORMAR
b.ta(
  "es-u9b-translate-plan",
  "transform",
  "Napisz po hiszpańsku: Co będziesz robić na urlopie?",
  "¿Qué vas a hacer en vacaciones?",
  ["¿Qué vas a hacer en vacaciones?", "¿Qué vas a hacer en las vacaciones?"],
);
b.ta(
  "es-u9b-translate-dream",
  "transform",
  "Napisz po hiszpańsku: Chciałbym zobaczyć morze.",
  "Me gustaría ver el mar.",
  ["Me gustaría ver el mar."],
);
b.ta(
  "es-u9b-translate-train",
  "transform",
  "Napisz po hiszpańsku: Pojadę pociągiem do Sewilli.",
  "Voy a ir / viajar en tren a Sevilla.",
  ["Voy a ir en tren a Sevilla.", "Voy a viajar en tren a Sevilla.", "Voy a ir a Sevilla en tren."],
);
b.ta(
  "es-u9b-translate-weeks",
  "transform",
  "Napisz po hiszpańsku: Będę tam dwa tygodnie.",
  "Voy a estar dos semanas.",
  ["Voy a estar dos semanas.", "Voy a estar allí dos semanas."],
);
b.ta(
  "es-u9b-translate-hot",
  "transform",
  "Napisz po hiszpańsku: Hotel jest strasznie drogi.",
  "El hotel es carísimo.",
  ["El hotel es carísimo."],
);
// EXPRESAR
b.write(
  "es-u9b-write-plan",
  "express",
  "Napisz wiadomość do znajomego z Hiszpanii o swoich planach urlopowych: dokąd, kiedy, na jak długo, czym, gdzie będziesz spać, co będziesz robić i o czym marzysz.",
  "Sprawdź: ir a / pensar / tener ganas de, me gustaría, przyimki a / en / de, czas trwania.",
  "¡Hola, Carmen! En julio pienso ir a Asturias con mi novio. Vamos a estar diez días. Vamos a viajar en coche desde Madrid y vamos a dormir en un camping cerca de la playa. Vamos a hacer senderismo y probar la comida típica. Tengo muchas ganas de ver el mar. ¡Y me gustaría volver a Polonia en Navidad!",
  ["dokąd i kiedy", "czym i na jak długo", "nocleg", "plany", "marzenie"],
  35,
  110,
  8,
);
b.write(
  "es-u9b-write-recommend",
  "express",
  "Hiszpański znajomy jedzie do twojego miasta w Polsce. Napisz, co musi zobaczyć i spróbować, jaka będzie pogoda i czym ma tam pojechać.",
  "Tienes que + bezokolicznik; va a hacer…; en tren / en avión.",
  "Si vas a ir a Gdansk en julio, tienes que ver la calle Długa y el puerto. Tienes que probar el pescado y los pierogi. En julio va a hacer buen tiempo, unos veinticinco grados, pero el mar va a estar frío. Desde Varsovia puedes ir en tren: es rápido y cómodo.",
  ["co zobaczyć", "co spróbować", "pogoda", "transport"],
  25,
  80,
  6,
);
console.log("9B", b.save(), "unit 9 total", renumber(9));

planImages([
  {
    asset: "a1-u9-holidays.png",
    prompt:
      "a man and a woman eat lunch at a table in a bright office kitchen, the woman enthusiastically shows something on her phone, a closed travel guidebook without visible text lies on the table, no maps, no text",
  },
]);
