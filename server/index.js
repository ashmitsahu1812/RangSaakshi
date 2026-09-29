const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database setup
const dbPath = path.join(__dirname, 'rangsaakshi.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS test_records (
    id TEXT PRIMARY KEY,
    case_number TEXT,
    fir_number TEXT,
    officer_name TEXT,
    officer_badge TEXT,
    officer_rank TEXT,
    officer_station TEXT,
    kit_id TEXT,
    kit_barcode TEXT,
    kit_batch TEXT,
    kit_expiry TEXT,
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    primary_drug TEXT,
    drug_group TEXT,
    confidence TEXT,
    score REAL,
    sample_weight REAL,
    ndps_category TEXT,
    hash_chain_final TEXT,
    color_curve_json TEXT,
    inference_json TEXT,
    blank_controls_json TEXT,
    reagent_results_json TEXT,
    witnesses_json TEXT,
    certificate_text TEXT,
    status TEXT DEFAULT 'completed',
    district TEXT,
    state TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS batch_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT,
    kit_id TEXT,
    field_result TEXT,
    lab_result TEXT,
    match BOOLEAN,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sms_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash_value TEXT,
    timestamp TEXT,
    gps_lat REAL,
    gps_lng REAL,
    phone_number TEXT,
    received_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS intelligence_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT,
    drug_group TEXT,
    drug_name TEXT,
    confidence TEXT,
    latitude REAL,
    longitude REAL,
    district TEXT,
    state TEXT,
    date TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_drug ON intelligence_points(drug_group);
  CREATE INDEX IF NOT EXISTS idx_intelligence_district ON intelligence_points(district);
  CREATE INDEX IF NOT EXISTS idx_batch_number ON batch_records(batch_number);
`);

// ─── API Routes ───

// Save a test record
app.post('/api/tests', (req, res) => {
  const t = req.body;
  const stmt = db.prepare(`
    INSERT INTO test_records (id, case_number, fir_number, officer_name, officer_badge, officer_rank, officer_station,
      kit_id, kit_barcode, kit_batch, kit_expiry, latitude, longitude, gps_accuracy,
      primary_drug, drug_group, confidence, score, sample_weight, ndps_category,
      hash_chain_final, color_curve_json, inference_json, blank_controls_json, reagent_results_json,
      witnesses_json, certificate_text, status, district, state, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    t.id, t.caseNumber, t.firNumber, t.officerName, t.officerBadge, t.officerRank, t.officerStation,
    t.kitId, t.kitBarcode, t.kitBatch, t.kitExpiry, t.latitude, t.longitude, t.gpsAccuracy,
    t.primaryDrug, t.drugGroup, t.confidence, t.score, t.sampleWeight, t.ndpsCategory,
    t.hashChainFinal, t.colorCurveJson, t.inferenceJson, t.blankControlsJson, t.reagentResultsJson,
    t.witnessesJson, t.certificateText, t.status || 'completed', t.district, t.state,
    t.createdAt || new Date().toISOString(), t.completedAt
  );

  // Also add to intelligence
  if (t.latitude && t.longitude && t.drugGroup) {
    db.prepare(`
      INSERT INTO intelligence_points (test_id, drug_group, drug_name, confidence, latitude, longitude, district, state, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.drugGroup, t.primaryDrug, t.confidence, t.latitude, t.longitude, t.district, t.state, t.createdAt);
  }

  res.json({ success: true, id: t.id });
});

// Get all tests
app.get('/api/tests', (req, res) => {
  const tests = db.prepare('SELECT * FROM test_records ORDER BY created_at DESC LIMIT 100').all();
  res.json(tests);
});

// Get single test
app.get('/api/tests/:id', (req, res) => {
  const test = db.prepare('SELECT * FROM test_records WHERE id = ?').get(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found' });
  res.json(test);
});

// Intelligence data
app.get('/api/intelligence', (req, res) => {
  const { drugGroup, district, startDate, endDate } = req.query;
  let query = 'SELECT * FROM intelligence_points WHERE 1=1';
  const params = [];

  if (drugGroup) { query += ' AND drug_group = ?'; params.push(drugGroup); }
  if (district) { query += ' AND district = ?'; params.push(district); }
  if (startDate) { query += ' AND date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND date <= ?'; params.push(endDate); }

  query += ' ORDER BY date DESC LIMIT 500';
  const points = db.prepare(query).all(...params);
  res.json(points);
});

// Intelligence stats
app.get('/api/intelligence/stats', (req, res) => {
  const byGroup = db.prepare('SELECT drug_group, COUNT(*) as count FROM intelligence_points GROUP BY drug_group ORDER BY count DESC').all();
  const byDistrict = db.prepare('SELECT district, state, COUNT(*) as count FROM intelligence_points GROUP BY district, state ORDER BY count DESC LIMIT 20').all();
  const byMonth = db.prepare("SELECT strftime('%Y-%m', date) as month, COUNT(*) as count FROM intelligence_points GROUP BY month ORDER BY month DESC LIMIT 12").all();
  const total = db.prepare('SELECT COUNT(*) as count FROM intelligence_points').get();
  const unknownCount = db.prepare("SELECT COUNT(*) as count FROM intelligence_points WHERE drug_group = 'Unknown'").get();

  res.json({ byGroup, byDistrict, byMonth, total, unknownCount });
});

// Batch analysis
app.get('/api/batches', (req, res) => {
  const batches = db.prepare(`
    SELECT batch_number, 
           COUNT(*) as total,
           SUM(CASE WHEN match = 0 THEN 1 ELSE 0 END) as mismatches,
           ROUND(CAST(SUM(CASE WHEN match = 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as mismatch_rate
    FROM batch_records
    GROUP BY batch_number
    ORDER BY mismatch_rate DESC
  `).all();
  res.json(batches);
});

// Add batch result
app.post('/api/batches', (req, res) => {
  const { batchNumber, kitId, fieldResult, labResult } = req.body;
  const match = fieldResult === labResult;
  db.prepare('INSERT INTO batch_records (batch_number, kit_id, field_result, lab_result, match) VALUES (?, ?, ?, ?, ?)')
    .run(batchNumber, kitId, fieldResult, labResult, match ? 1 : 0);
  res.json({ success: true });
});

// SMS backup receive
app.post('/api/sms-backup', (req, res) => {
  const { hash, timestamp, lat, lng, phone } = req.body;
  db.prepare('INSERT INTO sms_backups (hash_value, timestamp, gps_lat, gps_lng, phone_number) VALUES (?, ?, ?, ?, ?)')
    .run(hash, timestamp, lat, lng, phone);
  res.json({ success: true, receivedAt: new Date().toISOString() });
});

// Verify SMS backup
app.get('/api/sms-backup/verify/:hash', (req, res) => {
  const record = db.prepare('SELECT * FROM sms_backups WHERE hash_value = ?').get(req.params.hash);
  if (!record) return res.json({ found: false });
  res.json({ found: true, record });
});

// Compute file hash
app.post('/api/hash', (req, res) => {
  const upload = multer({ storage: multer.memoryStorage() }).single('file');
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Upload error' });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    res.json({ hash, algorithm: 'SHA-256', fileName: req.file.originalname, size: req.file.size });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0-SIH2026', uptime: process.uptime() });
});

// ─── Seed demo data ───
const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO intelligence_points (test_id, drug_group, drug_name, confidence, latitude, longitude, district, state, date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const demoData = [
  ['demo-1', 'Opioids', 'Heroin', 'confirmed', 28.6139, 77.2090, 'New Delhi', 'Delhi', '2026-09-28'],
  ['demo-2', 'Stimulants', 'Cocaine', 'probable', 19.0760, 72.8777, 'Mumbai', 'Maharashtra', '2026-09-27'],
  ['demo-3', 'Amphetamines', 'MDMA', 'confirmed', 12.9716, 77.5946, 'Bangalore', 'Karnataka', '2026-09-26'],
  ['demo-4', 'Cannabinoids', 'Cannabis', 'confirmed', 22.5726, 88.3639, 'Kolkata', 'West Bengal', '2026-09-25'],
  ['demo-5', 'Amphetamines', 'Methamphetamine', 'confirmed', 26.9124, 75.7873, 'Jaipur', 'Rajasthan', '2026-09-24'],
  ['demo-6', 'Unknown', 'Unknown Profile', 'possible', 23.0225, 72.5714, 'Ahmedabad', 'Gujarat', '2026-09-23'],
  ['demo-7', 'Opioids', 'Heroin', 'confirmed', 30.7333, 76.7794, 'Chandigarh', 'Chandigarh', '2026-09-22'],
  ['demo-8', 'Amphetamines', 'Amphetamine', 'probable', 17.3850, 78.4867, 'Hyderabad', 'Telangana', '2026-09-21'],
  ['demo-9', 'Opioids', 'Heroin', 'confirmed', 28.4595, 77.0266, 'Gurugram', 'Haryana', '2026-09-20'],
  ['demo-10', 'Stimulants', 'Cocaine', 'confirmed', 15.2993, 74.1240, 'Panaji', 'Goa', '2026-09-19'],
  ['demo-11', 'Psychedelics', 'LSD', 'probable', 18.5204, 73.8567, 'Pune', 'Maharashtra', '2026-09-18'],
  ['demo-12', 'Unknown', 'Unknown Profile', 'possible', 25.3176, 82.9739, 'Varanasi', 'Uttar Pradesh', '2026-09-17'],
];

const seedBatch = db.prepare(`INSERT OR IGNORE INTO batch_records (batch_number, kit_id, field_result, lab_result, match) VALUES (?, ?, ?, ?, ?)`);

demoData.forEach(d => seedStmt.run(...d));

// Seed batch data
[
  ['BATCH-2026-041', 'nij-5', 'Heroin', 'Heroin', 1],
  ['BATCH-2026-041', 'nij-5', 'Cocaine', 'Cocaine', 1],
  ['BATCH-2026-041', 'nij-5', 'Heroin', 'Morphine', 0],
  ['BATCH-2026-039', 'nij-5', 'MDMA', 'MDA', 0],
  ['BATCH-2026-039', 'nij-5', 'Heroin', 'Sugar', 0],
  ['BATCH-2026-040', 'nij-5', 'Cannabis', 'Cannabis', 1],
  ['BATCH-2026-040', 'nij-5', 'LSD', 'LSD', 1],
  ['BATCH-2026-038', 'nij-5', 'Methamphetamine', 'Methamphetamine', 1],
  ['BATCH-2026-038', 'nij-5', 'Cocaine', 'Cocaine', 1],
  ['BATCH-2026-042', 'nij-5', 'Unknown', 'New Synthetic', 0],
  ['BATCH-2026-042', 'nij-5', 'Unknown', 'New Synthetic', 0],
  ['BATCH-2026-037', 'nij-5', 'Amphetamine', 'Amphetamine', 1],
].forEach(d => {
  try { seedBatch.run(...d); } catch (e) { /* ignore duplicates */ }
});

app.listen(PORT, () => {
  console.log(`\n  🧪 RangSaakshi API Server running on http://localhost:${PORT}`);
  console.log(`  📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`  🗺️  Intelligence: http://localhost:${PORT}/api/intelligence`);
  console.log(`  ⚠️  Batches: http://localhost:${PORT}/api/batches\n`);
});
