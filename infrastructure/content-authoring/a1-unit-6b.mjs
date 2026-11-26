// Spanish for Polish speakers — A1 unit 6B (¿Quedamos? sport, invitations, plans) exercises.
//   node infrastructure/content-authoring/a1-unit-6b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const b = kit(6, "es-unit-6-plans", 300);
// PERCIBIR — the office dialogue
b.mc(
  "es-u6b-listen-invite",
  "perceive",
  "Dialog: do czego Lucía zaprasza Marka?",
  "¿Quieres jugar al pádel con nosotros?",
  ["Do gry w padla.", "Do kina.", "Na basen."],
);
b.tf(
  "es-u6b-listen-tennis",
  "perceive",
  "Dialog: Marek umie grać w padla.",
  "Marek mówi no sé jugar — umie grać tylko w tenisa (solo juego al tenis).",
  false,
);
b.mc(
  "es-u6b-listen-saturday",
  "perceive",
  "Dialog: dlaczego Marek nie może w sobotę?",
  "Tengo que ayudar a mi hermano con la mudanza.",
  ["Musi pomóc bratu w przeprowadzce.", "Musi pracować.", "Idzie na basen."],
);
b.mc(
  "es-u6b-listen-when-where",
  "perceive",
  "Dialog: kiedy i gdzie się umawiają?",
  "Quedamos el domingo a las diez en el polideportivo.",
  [
    "W niedzielę o 10:00 w ośrodku sportowym.",
    "W sobotę o 10:00 w parku.",
    "W niedzielę o 11:00 w biurze.",
  ],
);
b.tf(
  "es-u6b-listen-racket",
  "perceive",
  "Dialog: Marek musi przynieść własną rakietę.",
  "Nie — Lucía ma dwie. Marek musi wziąć tylko wodę i buty sportowe.",
  false,
);
// CONECTAR — sports and places
b.match(
  "es-u6b-match-sports",
  "connect",
  "Połącz sporty z tłumaczeniem.",
  "Baloncesto = balón + cesto (kosz); balonmano = balón + mano (ręka).",
  [
    ["el baloncesto", "koszykówka"],
    ["el balonmano", "piłka ręczna"],
    ["el voleibol", "siatkówka"],
    ["el ajedrez", "szachy"],
    ["el senderismo", "turystyka górska"],
    ["el partido", "mecz"],
  ],
);
b.match(
  "es-u6b-match-places",
  "connect",
  "Połącz miejsca i rzeczy z tłumaczeniem.",
  "La pista = kort; el polideportivo = ośrodek sportowy.",
  [
    ["la piscina", "basen"],
    ["la pista", "kort"],
    ["el polideportivo", "ośrodek sportowy"],
    ["el equipo", "drużyna"],
    ["las zapatillas de deporte", "buty sportowe"],
  ],
);
b.gap(
  "es-u6b-gap-jugar-hacer",
  "connect",
  "Uzupełnij: juego al / hago.",
  "Jugar a + gra z piłką lub zasadami; hacer + yoga, deporte, senderismo, surf.",
  "Los lunes ___ baloncesto, los miércoles ___ yoga y los sábados ___ senderismo.",
  [["juego al"], ["hago"], ["hago"]],
);
b.mc(
  "es-u6b-ganar-perder",
  "connect",
  "Uzupełnij: Mi equipo siempre ___, ¡nunca gana!",
  "Perder (e → ie) — przegrywać: pierde.",
  ["pierde", "gana", "juega"],
);
b.mc(
  "es-u6b-tomar-algo",
  "connect",
  "Co znaczy tomar algo?",
  "Tomar algo = napić się czegoś (zwykle na mieście, w barze).",
  ["Napić się czegoś na mieście.", "Wziąć coś ze sobą.", "Zrobić zakupy."],
);
// ESTRUCTURAR — invitations, poder/querer/saber, quedar
b.gap(
  "es-u6b-gap-poder",
  "structure",
  "Uzupełnij formą czasownika poder.",
  "Poder: o → ue we wszystkich osobach poza nosotros i vosotros.",
  "Yo no ___ el sábado. ¿Tú ___ el domingo? Nosotros ___ a las diez.",
  [["puedo"], ["puedes"], ["podemos"]],
);
b.gap(
  "es-u6b-gap-querer",
  "structure",
  "Uzupełnij formą czasownika querer.",
  "Querer: e → ie (quiero, quieres, quiere, queremos, queréis, quieren).",
  "¿___ (tú) venir al cine? Mis amigos ___ jugar al fútbol, pero yo ___ nadar.",
  [["Quieres"], ["quieren"], ["quiero"]],
);
b.gap(
  "es-u6b-gap-saber",
  "structure",
  "Uzupełnij formą czasownika saber.",
  "Saber jest nieregularne tylko w formie yo: sé.",
  "Yo no ___ esquiar, pero mi hermana ___ esquiar muy bien. ¿Vosotros ___ patinar?",
  [["sé"], ["sabe"], ["sabéis"]],
);
b.mc(
  "es-u6b-se-puedo",
  "structure",
  "Nigdy nie uczyłeś się pływać. Co mówisz?",
  "Brak umiejętności: no sé + bezokolicznik.",
  ["No sé nadar.", "No puedo nadar.", "No quiero nadar."],
);
b.mc(
  "es-u6b-puedo-today",
  "structure",
  "Umiesz pływać, ale dziś masz gorączkę. Co mówisz?",
  "Umiesz, ale nie możesz: hoy no puedo nadar.",
  ["Hoy no puedo nadar.", "Hoy no sé nadar.", "Hoy no nado sé."],
);
b.mc(
  "es-u6b-apetece",
  "structure",
  "Które zaproszenie jest poprawne?",
  "Apetecer działa jak gustar: ¿te apetece…?",
  ["¿Te apetece tomar un café?", "¿Apeteces tomar un café?", "¿Tú apetece tomar un café?"],
);
b.mc(
  "es-u6b-quedarse",
  "structure",
  "Uzupełnij: Estoy cansado. Hoy ___ en casa.",
  "Zostać to quedarse: me quedo. Bez się quedar znaczy „umówić się”.",
  ["me quedo", "quedo", "quedamos"],
);
b.mc(
  "es-u6b-polite-no",
  "structure",
  "— ¿Vamos al cine el viernes? Nie możesz. Która odpowiedź jest najgrzeczniejsza?",
  "Przeprosiny + powód + inny termin.",
  ["¡Qué pena! El viernes tengo que trabajar. ¿Otro día?", "No.", "No quiero ir al cine contigo."],
);
b.match(
  "es-u6b-match-questions",
  "structure",
  "Połącz pytanie z odpowiedzią.",
  "¿Cuándo? — dzień; ¿A qué hora? — godzina; ¿Dónde? — miejsce.",
  [
    ["¿Cuándo quedamos?", "El sábado por la tarde."],
    ["¿A qué hora quedamos?", "Sobre las seis."],
    ["¿Dónde quedamos?", "Delante del cine."],
    ["¿Con quién quedas?", "Con mis compañeros."],
  ],
);
b.order(
  "es-u6b-order-plan",
  "structure",
  "Ułóż zdanie: Spotykamy się w niedzielę o dziesiątej w ośrodku sportowym.",
  "Quedamos + kiedy + o której + gdzie.",
  ["Quedamos", "el domingo", "a las diez", "en el polideportivo."],
);
b.order(
  "es-u6b-order-sorry",
  "structure",
  "Ułóż odmowę: Przykro mi, w sobotę nie mogę.",
  "Lo siento + el sábado + no puedo.",
  ["Lo", "siento,", "el", "sábado", "no", "puedo."],
);
// SONAR — linking words
b.mc(
  "es-u6b-sound-link",
  "sound",
  "Jak Hiszpan wymawia los amigos?",
  "Końcowa spółgłoska łączy się z samogłoską następnego słowa: [lo-sa-mi-gos].",
  ["[lo-sa-mi-gos], bez przerwy.", "[los] — przerwa — [amigos].", "[lo-a-mi-gos], bez s."],
);
b.tf(
  "es-u6b-sound-stop",
  "sound",
  "Przed słowem zaczynającym się od samogłoski (np. ¿te apetece?) robimy krótkie zatrzymanie w gardle, jak po polsku.",
  "Nie — po hiszpańsku samogłoski na styku słów zlewają się: [tea-pe-te-se].",
  false,
);
b.mc(
  "es-u6b-sound-h",
  "sound",
  "Jak połączysz en el hotel?",
  "H jest nieme, więc łączymy przez nie: [e-ne-lo-tel].",
  ["[e-ne-lo-tel]", "[en-el-ho-tel]", "[e-nel-cho-tel]"],
);
// CULTURA — reading and culture
b.mc(
  "es-u6b-reading-andres",
  "culture",
  "Lectura: dlaczego Andrés nie może grać w niedzielę?",
  "El domingo tengo que trabajar.",
  ["Musi pracować.", "Boli go ręka.", "Nie umie grać."],
);
b.tf(
  "es-u6b-reading-carmen",
  "culture",
  "Lectura: Carmen nie zagra, ale przyjdzie obejrzeć mecz.",
  "Me duele el brazo. ¿Puedo ir a ver el partido? — ¡Claro!",
  true,
);
b.mc(
  "es-u6b-reading-players",
  "culture",
  "Lectura: kogo Lucía zapyta, bo brakuje graczy?",
  "Voy a preguntar a mi hermana y a su novio.",
  ["Siostrę i jej chłopaka.", "Andrésa i Carmen.", "Kolegów z pracy."],
);
b.mc(
  "es-u6b-reading-vermu",
  "culture",
  "Lectura: co znaczy ¡Invito yo!?",
  "Invitar = zapraszać, ale też stawiać: ¡Invito yo! — ja stawiam.",
  ["Ja stawiam.", "Ja zapraszam do domu.", "Ja też przyjdę."],
);
b.mc(
  "es-u6b-culture-summer",
  "culture",
  "Kultura: kiedy latem na południu Hiszpanii najlepiej uprawiać sport?",
  "W środku dnia jest za gorąco — sport rano albo późnym wieczorem.",
  ["Wcześnie rano albo późnym wieczorem.", "W samo południe.", "Zaraz po obiedzie, o 15:00."],
);
// TRANSFORMAR — translations
b.ta(
  "es-u6b-translate-want",
  "transform",
  "Napisz po hiszpańsku: Chcesz zagrać w tenisa w sobotę?",
  "¿Quieres + bezokolicznik? Jugar al tenis.",
  ["¿Quieres jugar al tenis el sábado?", "¿Quieres jugar al tenis este sábado?"],
);
b.ta(
  "es-u6b-translate-cant",
  "transform",
  "Napisz po hiszpańsku: Przykro mi, nie mogę. Muszę pracować.",
  "Lo siento, no puedo + tengo que + bezokolicznik.",
  [
    "Lo siento, no puedo. Tengo que trabajar.",
    "Lo siento, no puedo, tengo que trabajar.",
    "Lo siento. No puedo. Tengo que trabajar.",
  ],
);
b.ta(
  "es-u6b-translate-ski",
  "transform",
  "Napisz po hiszpańsku: Nie umiem jeździć na nartach.",
  "Umiejętność: no sé + esquiar.",
  ["No sé esquiar.", "Yo no sé esquiar."],
);
b.ta(
  "es-u6b-translate-time",
  "transform",
  "Napisz po hiszpańsku: O której się umawiamy?",
  "¿A qué hora + quedamos?",
  ["¿A qué hora quedamos?"],
);
b.ta(
  "es-u6b-translate-stay",
  "transform",
  "Napisz po hiszpańsku: W niedzielę zostaję w domu.",
  "Zostać = quedarse: me quedo.",
  ["El domingo me quedo en casa.", "Me quedo en casa el domingo."],
);
// EXPRESAR — writing
b.write(
  "es-u6b-write-invite",
  "express",
  "Napisz wiadomość do kolegi lub koleżanki z pracy: zaproś na sport albo inny plan, zaproponuj dzień, godzinę i miejsce, i napisz, co trzeba zabrać.",
  "Sprawdź: ¿quieres / te apetece + bezokolicznik, jugar al / hacer, quedamos + kiedy + gdzie.",
  "¡Hola, Pablo! ¿Te apetece jugar al baloncesto el sábado por la mañana? Somos cinco y necesitamos una persona más. ¿Te va bien a las once? Quedamos en el polideportivo, al lado de la piscina. Tienes que llevar zapatillas de deporte y agua. Después tomamos algo en el bar. ¿Puedes?",
  ["zaproszenie", "dzień i godzina", "miejsce", "co zabrać", "pytanie na końcu"],
  30,
  90,
  7,
);
b.write(
  "es-u6b-write-decline",
  "express",
  "Odpowiedz na zaproszenie: «¿Quieres venir a hacer senderismo el domingo? Salimos a las ocho.» Odmów grzecznie, podaj powód i zaproponuj inny plan.",
  "Lo siento / ¡qué pena! + no puedo + tengo que… + ¿por qué no…? / ¿otro día?",
  "¡Qué pena! El domingo no puedo: tengo que estudiar para un examen. Además, no sé si puedo andar tanto. ¿Por qué no vamos a nadar el sábado por la tarde? Quedamos a las seis en la piscina, ¿te va bien?",
  ["przeprosiny", "powód z tengo que", "inny plan", "godzina i miejsce"],
  25,
  80,
  6,
);
console.log("6B", b.save(), "unit 6 total", renumber(6));

planImages([
  {
    asset: "a1-u6-plans.png",
    prompt:
      "a man and a woman, office coworkers, chatting next to a coffee machine in a bright modern office, the woman carries a sports bag with a racket handle sticking out over her shoulder, both smiling, morning light",
  },
]);
