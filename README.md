# BFT HUB — PWA d'officina

Calcolatrice dei parametri di taglio (fresatura, tornitura, foratura, filettatura) e
tabelle tecniche di riferimento (tolleranze ISO 286, filettature M/Tr/Whitworth/Gas/NPT/Unificate).

L'app è una **PWA (Progressive Web App)**: si apre nel browser ma è **installabile** su
**PC, tablet e telefono** con icona propria e funziona **100% offline** dopo la prima apertura.

## Struttura

| File | Ruolo |
|------|-------|
| `index.html` | L'app completa (HTML + CSS + JS, nessuna dipendenza) |
| `manifest.webmanifest` | Metadati PWA: nome, icone, modalità standalone |
| `sw.js` | Service worker: cache offline dell'app e dei font |
| `icons/` | Icone dell'app (PNG + SVG) generate da `scripts/gen-icons.js` |
| `.github/workflows/deploy.yml` | Pubblicazione automatica su GitHub Pages |

## Pubblicare l'app (per installarla su PC e tablet)

Una PWA va servita via **HTTPS** (il service worker non funziona aprendo il file con doppio clic).
Il modo più semplice e gratuito è **GitHub Pages**, già configurato in questo repo:

1. Su GitHub vai in **Settings → Pages**
2. In **Build and deployment → Source** scegli **GitHub Actions**
3. Il workflow `Deploy PWA to GitHub Pages` pubblica il sito a ogni push.
   Al termine trovi l'URL pubblico nella scheda **Actions** (o di nuovo in Settings → Pages),
   tipo `https://<utente>.github.io/<repo>/`

### Installare l'app dall'URL pubblicato

- **PC (Chrome / Edge):** apri l'URL → icona **Installa** ⊕ nella barra degli indirizzi → *Installa*.
- **Android / tablet Android (Chrome):** menu ⋮ → **Installa app** / *Aggiungi a schermata Home*.
- **iPad / iPhone (Safari):** pulsante **Condividi** → **Aggiungi a Home**.

Dopo l'installazione l'app parte a tutto schermo, con icona propria, e funziona senza rete.

## Provare in locale

```bash
# dalla cartella del progetto
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Su `localhost` il service worker funziona, quindi puoi testare offline e l'installazione.

## Rigenerare le icone

Le icone (la "B" gialla BFT) sono generate da uno script senza dipendenze:

```bash
node scripts/gen-icons.js
```

## Archivio cloud condiviso (Firebase Realtime Database)

L'archivio funziona **offline su ogni dispositivo** (memoria locale) e, se configurato,
si **sincronizza** con un database cloud condiviso tra tutti i dispositivi aziendali.

### Setup (gratuito, ~10 minuti)

1. Vai su <https://console.firebase.google.com> → **Aggiungi progetto**.
2. **Build → Realtime Database → Crea database** → modalità **test** (accesso aperto) → scegli una regione.
3. In alto compare l'**URL del database**, del tipo
   `https://<progetto>-default-rtdb.firebaseio.com`
   (oppure `...-default-rtdb.europe-west1.firebasedatabase.app`).
4. Apri `cloud-config.js`, incolla l'URL, **committa**:

   ```js
   window.BFT_CLOUD = {
     provider: 'rtdb',
     databaseURL: 'https://il-tuo-progetto-default-rtdb.firebaseio.com',
     collection: 'bft_tests'
   };
   ```

   Da quel momento **tutti i dispositivi** che aprono l'app condividono lo stesso archivio.
   In alternativa, per una prova rapida su un solo dispositivo, usa il pulsante **☁ Cloud…**
   nella vista Archivio e incolla lì l'URL (salvato solo in locale).

### Come funziona la sincronizzazione
- Ogni salvataggio va **subito in locale** e viene inviato al cloud.
- L'app si sincronizza all'avvio, ogni ~60 secondi, al rientro online e al focus.
- Le **eliminazioni** si propagano a tutti i dispositivi.
- In assenza di rete tutto continua a funzionare; le modifiche partono appena torna la connessione.
- Stato visibile in alto a destra nell'Archivio: *Sincronizzato / Sincronizzazione… / Offline*.

### Regole di sicurezza Realtime Database
La modalità **test** scade dopo 30 giorni. Per un archivio interno permanente, in
**Realtime Database → Regole** imposta (accesso aperto, come da scelta "Aperto"):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> Nota: con regole aperte chiunque conosca il `databaseURL` può leggere/scrivere.
> Per un'app pubblica su internet, in futuro si può aggiungere un login per operatore.

### Limiti del piano gratuito
Realtime Database (piano Spark): **1 GB** di dati archiviati e **10 GB/mese** di traffico
in download — abbondante per un'officina.

## Aggiornamenti

Quando modifichi l'app, incrementa `CACHE_VERSION` in `sw.js` (es. `bft-calc-v2`)
così i dispositivi già installati scaricano la nuova versione.
