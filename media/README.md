# Media

## Video della home (hero)

Metti qui il file del video di sfondo della home con questo nome esatto:

```
media/hero.mp4
```

Requisiti consigliati:
- **Formato:** MP4 (codec H.264 + AAC o senza audio).
- **Durata:** 5–12 secondi in loop.
- **Peso:** il più leggero possibile (idealmente < 4–5 MB) perché viene incluso
  nella cache offline dell'app.
- **Risoluzione:** 1280×720 o 1920×1080, orientamento orizzontale.
- **Audio:** non necessario (il video parte muto in autoplay/loop).

Dopo aver aggiunto il file, aumenta la versione della cache in `sw.js`
(`CACHE_VERSION`) per forzare l'aggiornamento offline su tutti i dispositivi.

Finché il file non è presente, la home mostra automaticamente la foto della
pantera (`icons/logo-feline.jpg`) come immagine di sfondo dell'hero.
