# Santini 3D - PWA

Progressive Web App in 3D (Three.js) che mostra i santi del giorno sotto forma di santini con cornice dorata e permette di lanciarli con uno swipe come un frisbee verso 4 scenari 3D:
- Cima di una montagna
- Tetto di un grattacielo
- Scogliera sul mare
- Terrazzo di Piazza San Pietro

## Struttura del progetto
- `index.html`: Interfaccia e canvas WebGL
- `santi.js`: Database dei santi del giorno e pool di 10 illustrazioni casuali
- `app.js`: Motore 3D, generatore dinamico delle texture dei santini e fisica di lancio frisbee
- `manifest.json` & `sw.js`: Configurazione PWA installabile e supporto offline
