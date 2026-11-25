# Amici – Pizza Napoletana

Statische Website, keine Abhängigkeiten (nur Node ≥ 20).

```sh
npm run dev     # http://localhost:5173 – baut neu + lädt den Browser bei jeder Änderung
npm run build   # erzeugt dist/ → diesen Ordner beim Hoster hochladen
```

## Inhalte ändern

| Datei | Inhalt |
| --- | --- |
| `content/menu.json` | Speisekarte (Gerichte, Preise, Abschnitte) |
| `content/site.json` | Adresse, Telefon, Öffnungszeiten, Angaben für Impressum/Datenschutz |
| `content/impressum.html`, `content/datenschutz.html` | Rechtstexte (Dummy – vor Livegang ersetzen) |
| `src/styles.css` | Design |
| `src/img/logo.svg` | Logo (Nachbau, Schrift „PIZZA NAPOLETANA“ als Pfade) |

Preise in `menu.json` als Zahl eintragen (`11.9`); sie werden als „11,9 €“ angezeigt.

## Schriften

Poppins (Überschriften, Namen, Preise) und Cormorant Garamond (Beschreibungen), lokal in `src/fonts/` (OFL-Lizenz).
