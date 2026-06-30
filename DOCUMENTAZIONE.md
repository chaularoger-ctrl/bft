# BFT HUB — Documentazione di progetto

**BFT HUB** è lo strumento d'officina interno di **BFT Burzoni**: una web‑app
(PWA) che riunisce in un unico posto il **calcolo dei parametri di taglio**,
le **tabelle tecniche di riferimento**, un **archivio prove** con report e i
**confronti tra strategie di lavorazione**.

- **100% offline** dopo la prima apertura · **installabile** su PC, tablet e telefono
- **Nessuna dipendenza esterna**: tutto in HTML + CSS + JavaScript "vanilla"
- Tema **chiaro/scuro** · interfaccia in **italiano**

> Nome storico del progetto: *BFT CALC*. Rinominato **BFT HUB** perché l'app è
> cresciuta da semplice calcolatrice a *hub* di strumenti per l'officina.

---

## Indice
1. [A chi serve e cosa fa](#a-chi-serve-e-cosa-fa)
2. [Funzionalità in dettaglio](#funzionalità-in-dettaglio)
3. [Formule e norme di riferimento](#formule-e-norme-di-riferimento)
4. [Architettura tecnica](#architettura-tecnica)
5. [Struttura dei file](#struttura-dei-file)
6. [Modello dati dell'archivio](#modello-dati-dellarchivio)
7. [Sviluppo, build e deploy](#sviluppo-build-e-deploy)
8. [Offline, aggiornamenti e cache](#offline-aggiornamenti-e-cache)
9. [Archivio cloud condiviso](#archivio-cloud-condiviso)
10. [Privacy e dati](#privacy-e-dati)
11. [Idee / roadmap](#idee--roadmap)

---

## A chi serve e cosa fa

Strumento da banco per chi programma e manda in macchina lavorazioni di
**fresatura, tornitura, foratura e filettatura**. Permette di:

- calcolare in tempo reale i parametri di taglio e i risultati (potenza,
  coppia, tempo, costo, rugosità…);
- valutare l'**economia** reale per pezzo e per lotto (vita utensile, inserti,
  fermi macchina) e il **risparmio** tra due strategie;
- consultare **tabelle normate** (tolleranze, filettature, rugosità) e
  convertire unità di misura;
- registrare le **prove** in un archivio e produrre un **report tecnico** (PDF)
  da presentare al cliente — una vera **consulenza a 360°**.

---

## Funzionalità in dettaglio

### 1. Calcolatrice parametri di taglio
Quattro lavorazioni: **Fresatura · Tornitura · Foratura · Filettatura**.
Flusso **guidato a passi** (1 Materiale → 2 Parametri → 3 Risultati) con
sezioni che si sbloccano man mano e un solo campo "attivo" per volta.

- **Material‑first**: si parte dal **materiale**. Database interno di **oltre
  700 leghe** (sigle SAE/DIN/Werkstoff) con **kc₁.₁** e **mc** di Kienzle;
  l'app imposta automaticamente **kc** e i **range consigliati** di Vc e
  avanzamento per gruppo ISO 513 (P/M/K/N/S/O).
- **Foratura**: scelta **tipo foro** (passante/cieco) e **lunghezza foro**;
  calcolo di **fn** (e fz/tagliente) e **forza di avanzamento** stimata.
- **Risultati**: n, Vc, Vf, avanzamento, **Q (MRR)**, hₘ/hₑₓ (spessore
  truciolo, fresatura), **Ra teorica**, **Pc**, **P motore**, **Mc**,
  **Tc** (espresso in **ore/min/secondi**), **percorso utensile totale**.

### 2. Potenza ed economia (costo reale)
- **Potenza/coppia/tempo**: Pc, P motore (Pc/η), Mc, Tc; **controllo potenza
  macchina** con avviso se la P motore supera il mandrino.
- **Modello di costo per pezzo e per lotto** basato sulla **vita utensile**:
  pezzi per tagliente, costo macchina, **costo taglienti** (prezzo inserto ÷
  taglienti per inserto + ammortamento corpo), **fermi macchina**, **costo/
  pezzo** e **costo lotto**.
- **Fattore z**: su utensili a inserti multipli (fresa) il consumo di
  consumabili scala con il numero di inserti — il modello lo tiene in conto.
- **Consumabili per il lotto**: taglienti/lotto, **inserti da comprare/lotto**,
  utensili/lotto (per gli integrali).

### 3. Confronto A/B tra strategie
Si salvano due set di parametri (**A** e **B**, ciascuno con i propri dati
utensile completi) e si vedono a confronto: parametri, potenza, costo,
**risparmio per pezzo e sul lotto**, con il vincitore evidenziato e barre
grafiche. Il confronto è **salvabile come prova** in archivio (scheda/PDF
dedicata con le due strategie separate).

### 4. Grafici (SVG, offline, tema‑aware)
- **Curva di Kienzle** kc vs spessore truciolo h, con il punto di lavoro.
- **Trade‑off MRR / Ra** al variare dell'avanzamento, con la fascia consigliata.
- **Barre di confronto** A/B per MRR, Pc, Tc, Costo.

### 5. Tabelle tecniche
- **Tolleranze** ISO 286‑1: quota con tolleranza (albero/foro, lettera + grado IT).
- **Filettature**: M, passo fine, **trapezia (Tr)**, **Whitworth (BSW/BSP)**,
  **NPT**, **Unificate (UNC/UNF/UNEF)** — con d₂, d₃, D₁, sezione resistente,
  preforo e disegno del profilo.
- **Rugosità** (selettore a 3 strumenti):
  - **Conversione Ra · Rz · N** + simbolo ▽ (ISO 21920 / ISO 1302);
  - **Avanzamento di finitura tornitura** (Ra → fn) con **cursore "margine di
    sicurezza"** (da teorico a prudenziale);
  - **Rugosità di fresatura** (fresa a sfera): scallop **Rth** da Dc e aₑ, con disegno.
- **Convertitore di unità** (4 grandezze): mm/pollici/mil · angoli (°/rad/gon +
  gradi‑primi‑secondi) · **durezza** (HRC/HV/HB/HRB/Rm, tabella acciai
  interpolata) · rugosità (Ra → Rz · N).

### 6. Archivio prove e report PDF
- Salvataggio locale di ogni prova con i parametri correnti + scheda dati.
- **Report tecnico strutturato** (stampa/PDF) nel flusso: *materiale → macchina
  → utensile → parametri → risultati → economia → usura → grafici →
  conclusioni*; risultati in evidenza, grafici ricostruiti dai dati salvati.
- **Dati consulenza** (cliente, agente, componente, stato macchina, staffaggio,
  trattamento termico, durezza, norma) e **identità utensile** differenziata
  **MDI vs a inserti** (codice corpo/fresa, codice inserto, rivestimento/qualità).
- **Refrigerante** con pressione (bar).

### 7. UX e accessibilità
- **Home** con **hero video** a tutta larghezza e titolo ad effetto *macchina da
  scrivere* ("BENVENUTI IN" → "BFT HUB").
- Aiuti contestuali **"?"** su (quasi) tutti i campi.
- **Tema chiaro/scuro**. Rispetto di **prefers‑reduced‑motion**.
- Avviso **"nuova versione disponibile · Aggiorna"** quando viene pubblicato un
  aggiornamento.

---

## Formule e norme di riferimento

**Taglio**
- Velocità ⇄ giri: `Vc = π·Dc·n/1000`
- Avanzamento tavola: `Vf = fz·z·n` (fresatura) · `Vf = fn·n` (tornitura/foratura)
- Asportazione **MRR (Q)**: fresatura `ap·ae·Vf/1000` · tornitura `Vc·ap·fn` ·
  foratura `(π/4)·Dc²·Vf/1000`
- **Ra teorica**: `Ra[µm] = fn²·1000 / (31,2·rε)`
- **Forza di taglio specifica (Kienzle)**: `kc = kc₁.₁ · h^(−mc)`
- Potenza/coppia/tempo: `Pc = Q·kc/60000` · `Pmot = Pc/η` · `Mc = 9549·Pc/n` ·
  `Tc = L·n°passate / Vf`
- **Forza di avanzamento** (foratura, stima): `≈ 0,5·kc·(Dc/2)·fn·sin κr`
- **Percorso totale**: `L · n°passate · n°pezzi(lotto)`

**Economia**
- Pezzi per tagliente: `ppe = vita / Tc`
- Costo per tagliente: `insP/taglienti + corpo/vita_corpo`
- Costo utensile/pz: `zEco · costo_tagliente / ppe` (zEco = n° inserti)
- Costo/pezzo: `Tc·tariffa + costo_utensile + fermi/pezzo` · Costo lotto: `× pezzi`
- Inserti/lotto: `⌈ zEco·pezzi / ppe ⌉ / taglienti_per_inserto` (arrotondato per eccesso)

**Tabelle**
- Finitura tornitura: `fn = √(Ra·rε·31,2/1000) · (1 − margine_sicurezza)`
- Scallop fresatura: `Rth = Dc/2 − √((Dc² − aₑ²)/4)`

**Norme citate**: ISO 286‑1 (tolleranze) · ISO 261/262, ISO 228/7,
ASME B1.1 / B1.20.1 (filettature) · ISO 21920 e ISO 1302 (rugosità) ·
ASTM E140 / ISO 18265 (conversione durezza) · ISO 513 (gruppi materiali) ·
modello di Kienzle (forza specifica di taglio).

> I valori indicativi (Rz, durezze, forza di avanzamento) sono dichiarati come
> tali nelle note dell'app.

---

## Architettura tecnica

- **Single‑page app a file singolo**: tutta l'interfaccia, lo stile e la logica
  sono dentro `index.html` (CSS e JS inline). Nessun framework, nessun bundler,
  nessuna dipendenza npm — sceltapensata per la longevità e l'offline.
- **PWA**: `manifest.webmanifest` (installazione, icone, modalità standalone) +
  `sw.js` (service worker) per il funzionamento offline.
- **Persistenza locale**: `localStorage` (prefisso `bftcalc_`) per archivio,
  preferenze e stato.
- **Sync cloud opzionale**: Firebase Realtime Database (vedi `cloud-config.js`).
- **Grafici e disegni**: **SVG** generati a runtime (curva kc, trade‑off, barre,
  profili filetto, schema scallop) — niente librerie di charting.
- **Navigazione**: viste `home / calcolatrice / archivio / tabelle` con
  sotto‑sezioni; stato di navigazione persistito.

---

## Struttura dei file

| File / cartella | Ruolo |
|---|---|
| `index.html` | L'app completa (HTML + CSS + JS, ~250 KB, nessuna dipendenza) |
| `sw.js` | Service worker: cache offline (app, font, video); avviso aggiornamenti |
| `manifest.webmanifest` | Metadati PWA: nome, icone, standalone |
| `cloud-config.js` | Configurazione archivio cloud condiviso (Firebase RTDB) |
| `icons/` | Icone app (PNG + SVG) + logo pantera |
| `media/hero.mp4` | Video di sfondo della home (incluso nella cache offline) |
| `scripts/gen-icons.js`, `scripts/jpeg-to-png.js` | Generazione icone (Node, senza dipendenze) |
| `.github/workflows/deploy.yml` | Pubblicazione automatica su GitHub Pages |
| `README.md` | Guida rapida (installazione, deploy, cloud) |
| `DOCUMENTAZIONE.md` | Questo documento |

---

## Modello dati dell'archivio

Ogni prova salvata è un oggetto JSON. Due tipi:

**Prova singola**
```jsonc
{
  "id": "…", "date": "ISO", "updatedAt": 0,
  "name": "…", "mode": "mill|turn|drill|tap",
  "inputs": { /* parametri di taglio del modo */ },
  "pw":     { /* economia: tariffe, vita, prezzi, lotto, kc, η, L… */ },
  "out":    { /* risultati: Vc, n, Q, Pc, Tc, costo, percorso… */ },
  "meta":   { /* materiale, macchina, utensile (toolId), consulenza, esito, note… */ }
}
```

**Confronto A/B** (`type: "compare"`)
```jsonc
{
  "id": "…", "date": "ISO", "type": "compare", "name": "A vs B",
  "cmp":      { "A": { /* snapshot */ }, "B": { /* snapshot */ } },
  "cmpNames": { "A": "…", "B": "…" },
  "meta":     { /* contesto condiviso */ }
}
```

---

## Sviluppo, build e deploy

**Niente build**: si modifica `index.html` e si ricarica.

**Provare in locale** (serve HTTPS o `localhost` per il service worker):
```bash
python3 -m http.server 8000   # poi apri http://localhost:8000
```

**Pubblicazione**: **GitHub Pages** via GitHub Actions (`deploy.yml`), ad ogni
push su `main`. L'URL pubblico compare in *Settings → Pages* / *Actions*.

**Rigenerare le icone**:
```bash
node scripts/gen-icons.js
```

---

## Offline, aggiornamenti e cache

- Il service worker mette in cache l'app e gli asset (compreso il video hero) e
  serve tutto **offline**.
- La **navigazione** recupera l'HTML sempre **fresco** quando si è online
  (`cache: 'no-store'`), così i nuovi aggiornamenti si vedono subito.
- Ad ogni rilascio si incrementa **`CACHE_VERSION`** in `sw.js`
  (es. `bft-calc-v38`): il nuovo service worker viene rilevato e mostra il
  banner **"Aggiorna"**; toccandolo l'app si aggiorna e ricarica.
- La chiave cache (`bft-calc-…`), l'`id` PWA del manifest e il prefisso
  `bftcalc_` del localStorage sono **mantenuti stabili** per non invalidare
  installazioni e dati salvati.

---

## Archivio cloud condiviso

Opzionale. L'archivio funziona offline su ogni dispositivo e, se configurato,
si **sincronizza** tra tutti i dispositivi aziendali tramite **Firebase
Realtime Database**. In `cloud-config.js`:

```js
window.BFT_CLOUD = {
  provider: 'rtdb',
  databaseURL: 'https://<progetto>-default-rtdb.<regione>.firebasedatabase.app',
  collection: 'bft_tests'
};
```

Sincronizzazione: ad ogni salvataggio (locale + invio), all'avvio, periodica,
al rientro online e al focus; le eliminazioni si propagano. Stato visibile
nell'Archivio (*Sincronizzato / … / Offline*).

> Con regole "aperte" chiunque conosca l'URL può leggere/scrivere: adatto a un
> uso interno; per un'app pubblica valutare un login.

---

## Privacy e dati

- I dati delle prove restano **sul dispositivo** (localStorage). Nessun invio a
  terzi salvo la sincronizzazione cloud **se** configurata dall'azienda.
- L'app non usa tracker né analytics. I font sono messi in cache per l'uso offline.

---

## Idee / roadmap

- Foratura a inserti con **inserto centrale e periferico distinti** (prezzo/vita separati).
- Costo lotto anche "a scatole intere" (inserti × prezzo) accanto al costo continuo.
- Tabelle durezza dedicate per materiali specifici (inox, temprati).
- Logo/intestazione aziendale in cima al PDF.

---

*Strumento interno BFT Burzoni · 100% offline · nessun dato trasmesso senza configurazione cloud.*
