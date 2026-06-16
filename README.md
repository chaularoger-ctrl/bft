# BFT CALC — PWA d'officina

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

## Aggiornamenti

Quando modifichi l'app, incrementa `CACHE_VERSION` in `sw.js` (es. `bft-calc-v2`)
così i dispositivi già installati scaricano la nuova versione.
