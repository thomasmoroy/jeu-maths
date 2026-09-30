const fs = require('fs');
const path = require('path');

const DB_PATH = path.join('/tmp', 'game_database.json');

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading db:', e);
  }
  return { players: {}, logs: [] };
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing db:', e);
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err) {
        body = {};
      }
    }

    let code = (body.code || '').trim().toUpperCase();
    if (!code) {
      const words = ['MAGIE', 'DRAGON', 'ETOILE', 'ECLAIR', 'SOLEIL', 'LUNE', 'SUPER', 'ROYAL'];
      const prefix = words[Math.floor(Math.random() * words.length)];
      const num = Math.floor(100 + Math.random() * 900);
      code = `${prefix}-${num}`;
    }

    const data = body.data || {};
    const playerName = data.playerName || 'Léa';
    const avatar = data.avatar || '🧙‍♀️';
    const stars = data.stars || 0;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const db = readDB();
    db.players[code] = {
      code,
      playerName,
      avatar,
      stars,
      data,
      updated_at: now
    };

    db.logs.push({
      player_code: code,
      action: 'save_sync',
      stars,
      timestamp: now
    });

    // Keep logs reasonable size
    if (db.logs.length > 100) {
      db.logs = db.logs.slice(-100);
    }

    writeDB(db);

    return res.status(200).json({
      success: true,
      code,
      db: 'Vercel Serverless Cloud DB',
      updated_at: now
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
