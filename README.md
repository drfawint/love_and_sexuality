# GitHub Pages Deployment

Diese Website ist als statische Seite gebaut und kann direkt auf GitHub Pages veröffentlicht werden.

## Enthaltene Dateien

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `.nojekyll`

## Schnellster Weg

1. Ein neues GitHub-Repository anlegen, zum Beispiel `normenwandel-liebe-sexualitaet`.
2. Den kompletten Inhalt dieses Ordners in das Repository kopieren.
3. Die Dateien in den `main`-Branch committen und zu GitHub pushen.
4. In GitHub unter `Settings` -> `Pages` als Quelle `Deploy from a branch` auswählen.
5. Den Branch `main` und den Ordner `/ (root)` wählen.
6. Speichern. Danach wird die Seite unter der GitHub-Pages-URL des Repositories veröffentlicht.

## Alternative mit `docs/`

Falls das Repository noch andere Inhalte enthalten soll, kann dieser Ordner auch als `docs/` in ein bestehendes Repository gelegt werden. In GitHub Pages dann als Quelle `main` + `/docs` auswählen.

## Daten aktualisieren

Wenn sich der Bilendi-Datensatz ändert, zuerst den Kerndatensatz und dann die Dashboard-Daten neu erzeugen:

```bash
cd "Pilots/Bilendi Pilot/statistics/do"
Rscript create_core_dataset.R
Rscript build_dashboard_data.R
```

Danach die aktualisierte `data.js` zusammen mit den übrigen Dashboard-Dateien erneut committen und pushen.

## Hinweis zur Bildungsgruppe

Ein direkter Studierendenstatus liegt im aktuellen Kerndatensatz nicht separat vor. Für die Website wird daher die Gruppe `Studiennah / Hochschulzugang` als transparenter Proxy verwendet.