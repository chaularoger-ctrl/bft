/* ============================================================
   Configurazione archivio cloud BFT — Firebase Realtime Database
   ------------------------------------------------------------
   Compila databaseURL con l'URL del TUO Realtime Database, poi
   committa questo file: tutti i dispositivi che aprono l'app
   useranno automaticamente lo stesso archivio condiviso.

   Dove trovo il valore? (gratis)
   1. https://console.firebase.google.com → progetto
   2. Build → Realtime Database → "Crea database"
      → modalità "test" → scegli una regione
   3. In alto vedrai l'URL del database, del tipo:
        https://<progetto>-default-rtdb.firebaseio.com
      (oppure ...-default-rtdb.europe-west1.firebasedatabase.app)
   4. Incollalo qui sotto e fai commit.

   Nota: con regole in modalità "test" chiunque abbia questo URL
   può leggere/scrivere. Per un uso interno va bene; se l'app è
   pubblica valuta in seguito un accesso con login.
   ============================================================ */
window.BFT_CLOUD = {
  provider: 'rtdb',
  databaseURL: '',      // es. 'https://bft-archivio-test-default-rtdb.firebaseio.com'
  collection: 'bft_tests'
};
