const express = require("express");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATEN_DIR = process.env.DATEN_DIR || path.join(__dirname, "daten");
const FOTOS_DIR = path.join(DATEN_DIR, "fotos");
const DB_PFAD = path.join(DATEN_DIR, "schrank.db");

fs.mkdirSync(FOTOS_DIR, { recursive: true });

const db = new Database(DB_PFAD);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS teile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kategorie TEXT NOT NULL,
    farbe TEXT NOT NULL,
    saison TEXT NOT NULL,
    foto TEXT,
    erstellt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outfits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    teile TEXT NOT NULL,
    erstellt TEXT NOT NULL
  );
`);

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/fotos", express.static(FOTOS_DIR));

// Nimmt ein Data-URL (z.B. "data:image/jpeg;base64,...") entgegen,
// schreibt es als echte .jpg-Datei auf die Platte und gibt den Dateinamen zurueck.
function fotoSpeichern(dataUrl) {
  const treffer = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl);
  if (!treffer) return null;
  const puffer = Buffer.from(treffer[1], "base64");
  const dateiname = `${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(path.join(FOTOS_DIR, dateiname), puffer);
  return dateiname;
}

function fotoLoeschen(dateiname) {
  if (!dateiname) return;
  const voller_pfad = path.join(FOTOS_DIR, dateiname);
  if (fs.existsSync(voller_pfad)) fs.unlinkSync(voller_pfad);
}

app.get("/api/alles", (req, res) => {
  const teile = db
    .prepare("SELECT * FROM teile ORDER BY erstellt DESC")
    .all()
    .map((t) => ({ ...t, saison: JSON.parse(t.saison) }));

  const outfits = db
    .prepare("SELECT * FROM outfits ORDER BY erstellt DESC")
    .all()
    .map((o) => ({ ...o, teile: JSON.parse(o.teile) }));

  res.json({ teile, outfits });
});

app.post("/api/teile", (req, res) => {
  const { name, kategorie, farbe, saison, foto } = req.body || {};

  if (!name || !kategorie) {
    return res.status(400).json({ fehler: "name und kategorie sind Pflichtfelder" });
  }

  const id = crypto.randomUUID();
  const dateiname = foto ? fotoSpeichern(foto) : null;
  const erstellt = new Date().toISOString();
  const saisonJson = JSON.stringify(Array.isArray(saison) ? saison : []);

  db.prepare(
    `INSERT INTO teile (id, name, kategorie, farbe, saison, foto, erstellt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, kategorie, farbe || "", saisonJson, dateiname, erstellt);

  res.status(201).json({
    id,
    name,
    kategorie,
    farbe: farbe || "",
    saison: Array.isArray(saison) ? saison : [],
    foto: dateiname,
    erstellt,
  });
});

app.delete("/api/teile/:id", (req, res) => {
  const teil = db.prepare("SELECT * FROM teile WHERE id = ?").get(req.params.id);
  if (!teil) return res.status(404).json({ fehler: "nicht gefunden" });

  fotoLoeschen(teil.foto);
  db.prepare("DELETE FROM teile WHERE id = ?").run(req.params.id);

  res.status(204).end();
});

app.post("/api/outfits", (req, res) => {
  const { name, teile } = req.body || {};

  if (!name || !teile || Object.keys(teile).length < 2) {
    return res.status(400).json({ fehler: "name und mindestens 2 Teile sind Pflicht" });
  }

  const id = crypto.randomUUID();
  const erstellt = new Date().toISOString();

  db.prepare(
    `INSERT INTO outfits (id, name, teile, erstellt) VALUES (?, ?, ?, ?)`
  ).run(id, name, JSON.stringify(teile), erstellt);

  res.status(201).json({ id, name, teile, erstellt });
});

app.delete("/api/outfits/:id", (req, res) => {
  const info = db.prepare("DELETE FROM outfits WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ fehler: "nicht gefunden" });
  res.status(204).end();
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kleiderschrank laeuft auf http://0.0.0.0:${PORT}`);
});
