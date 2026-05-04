# NQueue (Decky Loader Plugin)

NQueue fügt in der **Steam-Download-Ansicht** einen Button hinzu:

- **"Alle Updates einreihen"**

Beim Klick werden alle sichtbaren Update-/Download-Aktionen für unten gelistete Einträge ausgelöst, die noch nicht in der Queue sind.

## Hinweis zur Robustheit

Steam/Decky-UI-Klassen und Texte ändern sich gelegentlich. Dieses Plugin arbeitet deshalb mit einer heuristischen Suche auf sichtbaren Button-Texten (z. B. "Update", "Download", "Aktualisieren", "Fortsetzen") und überspringt typische Queue/Pause-Elemente.

Falls Valve UI-Texte stark ändert, kann ein kleines Update der Regex nötig sein.

## Entwicklung

```bash
cd /home/redeye/projects/decky-nque
pnpm install
pnpm run build
```

## Installation auf Decky

1. Plugin bauen (`pnpm run build`)
2. Den Plugin-Ordner mit mindestens folgenden Dateien nach Decky deployen:
   - `dist/index.js`
   - `plugin.json`
   - `package.json`
   - `main.py`
3. Decky neu laden/Steam UI neu starten

## Bedienung

- Öffne **Downloads** in Steam.
- Unten rechts erscheint ein schwebender Button: **Alle Updates einreihen**.
- Alternativ kannst du im Plugin-Panel den gleichen Trigger nutzen.

## Dateien

- `src/index.tsx`: Frontend-Logik (DOM-Beobachtung + Queue-Klicks)
- `main.py`: Minimaler Decky-Backend-Lifecycle
