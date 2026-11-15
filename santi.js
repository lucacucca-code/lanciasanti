// Database dei Santi del Giorno (chiave: "MM-DD")
// Esempio completo per oggi (15 Novembre) + altre date dimorative.
// Puoi aggiungere tutti i giorni dell'anno seguendo lo stesso formato.

// Database dei Santi del Giorno con immagini reali mirate e fallback di sicurezza

const SANTI_DATABASE = {
  // 15 Novembre (Santi con immagini reali verificate)
  "11-15": [
    { 
      nome: "Sant'Alberto Magno", 
      titolo: "Vescovo e Dottore della Chiesa", 
      bio: "Patrono degli scienziati e dei filosofi naturali.",
      fotoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Vicente_salvador_gomez-san_alberto.jpg"
    },
    { 
      nome: "San Leopoldo III il Pio", 
      titolo: "Margravio d'Austria", 
      bio: "Fondatore di monasteri e padre dei poveri.",
      fotoUrl: "https://www.santodelgiorno.it/foto/santo7363.jpg"
    },
    { 
      nome: "San Giuseppe Pignatelli", 
      titolo: "Sacerdote Gesuita", 
      bio: "Restauratore della Compagnia di Gesù.",
      fotoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4c/%D0%98%D0%BE%D1%81%D0%B8%D1%84_%D0%9F%D0%B8%D0%BD%D1%8C%D1%8F%D1%82%D0%B5%D0%BB%D0%BB%D0%B8.jpg"
    },
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
  // Fallback di esempio per altre date
  "default": [
    { 
      nome: "San Francesco d'Assisi", 
      titolo: "Patrono d'Italia", 
      bio: "Il poverello di Assisi, amante del Creato.",
      fotoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Raphael_-_Saint_Francis_of_Assisi_-_Google_Art_Project.jpg"
    },
    { nome: "Santa Chiara d'Assisi", titolo: "Vergine", bio: "Fondatrice delle Clarisse." },
    { nome: "San Pietro Apostolo", titolo: "Principe degli Apostoli", bio: "Primo Vescovo di Roma." },
    { nome: "San Paolo di Tarso", titolo: "Apostolo delle Genti", bio: "Instancabile annunciatore del Vangelo." },
    { nome: "Santa Teresa d'Avila", titolo: "Dottore della Chiesa", bio: "Mistica e riformatrice del Carmelo." }
  ]
};

const IMMAGINI_SANTI_POOL = [
  { icona: "🕊️", colorePrimario: "#1e3a8a", coloreSecondario: "#93c5fd", titolo: "Colomba dello Spirito" },
  { icona: "✝️", colorePrimario: "#7f1d1d", coloreSecondario: "#fca5a5", titolo: "Croce Gloriosa" },
  { icona: "📜", colorePrimario: "#78350f", coloreSecondario: "#fcd34d", titolo: "Dottore della Chiesa" },
  { icona: "🌿", colorePrimario: "#14532d", coloreSecondario: "#86efac", titolo: "Palma del Martirio" },
  { icona: "👑", colorePrimario: "#581c87", coloreSecondario: "#d8b4fe", titolo: "Corona Celeste" },
  { icona: "🕯️", colorePrimario: "#9a3412", coloreSecondario: "#fdba74", titolo: "Luce della Fede" },
  { icona: "⭐", colorePrimario: "#1e1b4b", coloreSecondario: "#a5b4fc", titolo: "Stella del Mattino" },
  { icona: "⛪", colorePrimario: "#3f3f46", coloreSecondario: "#e4e4e7", titolo: "Pietra Viva" },
  { icona: "🌹", colorePrimario: "#881337", coloreSecondario: "#fda4af", titolo: "Rosa Mistica" },
  { icona: "☀️", colorePrimario: "#854d0e", coloreSecondario: "#fde047", titolo: "Sole di Giustizia" }
];

function getSantiDiOggi() {
  const oggi = new Date();
  const mese = String(oggi.getMonth() + 1).padStart(2, '0');
  const giorno = String(oggi.getDate()).padStart(2, '0');
  const chiave = `${mese}-${giorno}`;

  const opzioniData = { day: 'numeric', month: 'long', year: 'numeric' };
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);

  const lista = SANTI_DATABASE[chiave] || SANTI_DATABASE["11-15"];

  return {
    dataFormattata,
    santi: lista.map(santo => {
      const graficaRandom = IMMAGINI_SANTI_POOL[Math.floor(Math.random() * IMMAGINI_SANTI_POOL.length)];
      return {
        ...santo,
        grafica: graficaRandom
      };
    })
  };
}
