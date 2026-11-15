// Database dei Santi del Giorno (chiave: "MM-DD")
// Esempio completo per oggi (15 Novembre) + altre date dimorative.
// Puoi aggiungere tutti i giorni dell'anno seguendo lo stesso formato.

const IMMAGINI_SANTI_POOL = [
  { id: 1, icona: "🕊️", colorePrimario: "#1e3a8a", coloreSecondario: "#93c5fd", titolo: "Colomba dello Spirito" },
  { id: 2, icona: "✝️", colorePrimario: "#7f1d1d", coloreSecondario: "#fca5a5", titolo: "Croce Gloriosa" },
  { id: 3, icona: "📜", colorePrimario: "#78350f", coloreSecondario: "#fcd34d", titolo: "Dottore della Chiesa" },
  { id: 4, icona: "🌿", colorePrimario: "#14532d", coloreSecondario: "#86efac", titolo: "Palma del Martirio" },
  { id: 5, icona: "👑", colorePrimario: "#581c87", coloreSecondario: "#d8b4fe", titolo: "Corona Celeste" },
  { id: 6, icona: "🕯️", colorePrimario: "#9a3412", coloreSecondario: "#fdba74", titolo: "Luce della Fede" },
  { id: 7, icona: "⭐", colorePrimario: "#1e1b4b", coloreSecondario: "#a5b4fc", titolo: "Stella del Mattino" },
  { id: 8, icona: "⛪", colorePrimario: "#3f3f46", coloreSecondario: "#e4e4e7", titolo: "Pietra Viva" },
  { id: 9, icona: "🌹", colorePrimario: "#881337", coloreSecondario: "#fda4af", titolo: "Rosa Mistica" },
  { id: 10, icona: "☀️", colorePrimario: "#854d0e", coloreSecondario: "#fde047", titolo: "Sole di Giustizia" }
];

const SANTI_DATABASE = {
  // 15 Novembre (Tutti i santi e beati principali del giorno)
  "11-15": [
    { nome: "Sant'Alberto Magno", titolo: "Vescovo e Dottore della Chiesa", bio: "Patrono degli scienziati e dei filosofi naturali." },
    { nome: "San Leopoldo III il Pio", titolo: "Margravio d'Austria", bio: "Fondatore di monasteri e padre dei poveri." },
    { nome: "San Giuseppe Pignatelli", titolo: "Sacerdote Gesuita", bio: "Restauratore della Compagnia di Gesù." },
    { nome: "San Malo (Maclovio)", titolo: "Vescovo in Bretagna", bio: "Evangelizzatore dell'Armorica." },
    { nome: "San Fintano di Rheinau", titolo: "Eremita", bio: "Monaco irlandese pellegrino in Svizzera." },
    { nome: "San Desiderio di Cahors", titolo: "Vescovo", bio: "Tesoriere reale e pastore caritatevole." },
    { nome: "San Gurias di Edessa", titolo: "Martire", bio: "Testimone della fede sotto Diocleziano." },
    { nome: "San Samonas di Edessa", titolo: "Martire", bio: "Compagno di martirio di San Gurias." },
    { nome: "San Abibo di Edessa", titolo: "Diacono e Martire", bio: "Martirizzato a Edessa per la fede cristiana." },
    { nome: "San Sidonio", titolo: "Abate", bio: "Discepolo di San Filiberto di Jumièges." },
    { nome: "San Marino di Cagliari", titolo: "Martire", bio: "Venerato in Sardegna fin dai primi secoli." },
    { nome: "Beata Lucia Broccadelli da Narni", titolo: "Vergine Domenicana", bio: "Mistica stimmatizzata del XV secolo." },
    { nome: "Beato Caio di Corea", titolo: "Martire", bio: "Catechista laico martirizzato in Giappone." },
    { nome: "Beato Ugo Faringdon", titolo: "Abate e Martire", bio: "Ultimo abate di Reading, martire in Inghilterra." }
  ],
  // Fallback di esempio per altre date se non ancora compilate
  "default": [
    { nome: "San Francesco d'Assisi", titolo: "Patrono d'Italia", bio: "Il poverello di Assisi, amante del Creato." },
    { nome: "Santa Chiara d'Assisi", titolo: "Vergine", bio: "Fondatrice delle Clarisse." },
    { nome: "San Pietro Apostolo", titolo: "Principe degli Apostoli", bio: "Primo Vescovo di Roma." },
    { nome: "San Paolo di Tarso", titolo: "Apostolo delle Genti", bio: "Instancabile annunciatore del Vangelo." },
    { nome: "Santa Teresa d'Avila", titolo: "Dottore della Chiesa", bio: "Mistica e riformatrice del Carmelo." }
  ]
};

function getSantiDiOggi() {
  const oggi = new Date();
  const mese = String(oggi.getMonth() + 1).padStart(2, '0');
  const giorno = String(oggi.getDate()).padStart(2, '0');
  const chiave = `${mese}-${giorno}`;

  const opzioniData = { day: 'numeric', month: 'long', year: 'numeric' };
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);

  // Per mostrare subito l'esempio ricco di oggi (15 Novembre) anche se l'utente apre l'app in un altro giorno,
  // controlliamo la chiave odierna, altrimenti carichiamo "11-15" come demo principale.
  const lista = SANTI_DATABASE[chiave] || SANTI_DATABASE["11-15"];

  return {
    dataFormattata,
    santi: lista.map(santo => {
      const imgRandom = IMMAGINI_SANTI_POOL[Math.floor(Math.random() * IMMAGINI_SANTI_POOL.length)];
      return {
        ...santo,
        grafica: imgRandom
      };
    })
  };
}
