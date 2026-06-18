/* ============================================================
   Configurazione archivio cloud BFT — Firebase Firestore
   ------------------------------------------------------------
   Compila projectId e apiKey con i valori del TUO progetto
   Firebase, poi committa questo file: tutti i dispositivi che
   aprono l'app useranno automaticamente lo stesso archivio
   condiviso.

   Dove trovo i valori? (gratis, ~10 minuti)
   1. https://console.firebase.google.com → "Aggiungi progetto"
   2. Menu Build → Firestore Database → "Crea database"
      → modalità "test" (accesso aperto) → scegli una regione
   3. Impostazioni progetto (ingranaggio) → sezione "Le tue app"
      → icona Web (</>) → registra un'app web
      → copia da firebaseConfig:  projectId  e  apiKey
   4. Incollali qui sotto e fai commit.

   Nota: con regole in modalità "test" chiunque abbia questi
   valori può leggere/scrivere. Per un uso interno va bene; se
   l'app è pubblica valuta in seguito un accesso con login.
   ============================================================ */
window.BFT_CLOUD = {
  provider: 'firestore',
  projectId: 'bft-archivio-test',
  apiKey: 'AIzaSyBX8haKQTRX6NPs29-AXyLMoexJxNVR7AQ',
  collection: 'bft_tests'
};
