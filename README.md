# Kleiderschrank

Eine selbstgehostete Web-App zum Katalogisieren von Kleidung und zum
Zusammenstellen von Outfits. Kein Cloud-Dienst, keine Registrierung —
läuft komplett auf deinem eigenen Server.

**Es gibt kein Login.** Solange die App nur über Tailscale erreichbar ist,
ist das in Ordnung. Sobald sie öffentlich (z. B. über Port-Forwarding im
Router) erreichbar sein soll, muss vorher eine Authentifizierung ergänzt
werden — frag danach, bevor du das einrichtest.

## Lokal starten (ohne Docker)

```bash
npm install
npm start
```

Die App läuft danach unter `http://localhost:3000`. Beim ersten Start legt
sie den Ordner `daten/` mit der SQLite-Datenbank und dem Unterordner
`daten/fotos/` selbst an.

## Mit Docker starten

```bash
docker compose up -d --build
```

Das baut das Image und startet den Container im Hintergrund. Die Daten
landen im Ordner `./daten` neben der `docker-compose.yml` — der Container
selbst bleibt zustandslos und kann jederzeit gefahrlos neu gebaut oder
gelöscht werden, ohne dass Kleidungsstücke oder Fotos verloren gehen.

Logs ansehen:

```bash
docker compose logs -f
```

Stoppen:

```bash
docker compose down
```

## Zugriff über Tailscale

Da Port 3000 auf `0.0.0.0` lauscht, erreichst du die App von jedem Gerät in
deinem Tailnet über die Tailscale-IP oder den MagicDNS-Namen deines Servers,
z. B.:

```
http://dein-server-name:3000
```

Ein Router-Port-Forwarding brauchst du dafür nicht — genau das ist der Sinn
von Tailscale: Zugriff aus der Ferne, ohne den Dienst dem offenen Internet
auszusetzen.

## Backup

Die komplette App-Daten stecken in einem einzigen Ordner. Ein Backup ist
damit ein simples Archiv:

```bash
tar czf kleiderschrank-backup-$(date +%Y-%m-%d).tar.gz daten/
```

Zum Wiederherstellen einfach den Container stoppen, das Archiv wieder nach
`daten/` entpacken und den Container neu starten.

## Hinweis zu Docker-Volumes

`docker-compose.yml` bindet `./daten` (relativ zu dieser Datei) an `/daten`
im Container. Der Server selbst schreibt immer nach `/daten`, weil das im
Dockerfile per `ENV DATEN_DIR=/daten` gesetzt ist. Ohne Docker (z. B. beim
lokalen `npm start`) fehlt diese Umgebungsvariable, dann schreibt der Server
stattdessen in einen `daten/`-Ordner direkt im Projektverzeichnis.
