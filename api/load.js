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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const code = (req.query.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code manquant' });
    }

    const db = readDB();
    const player = db.players[code];

    if (player && player.data) {
      return res.status(200).json({
        success: true,
        code,
        updated_at: player.updated_at,
        data: player.data
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `Aucun joueur trouvé avec le code '${code}' sur le serveur Vercel.`
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
