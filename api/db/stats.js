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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = readDB();
    const playersList = Object.values(db.players || {});
    playersList.sort((a, b) => (b.stars || 0) - (a.stars || 0));

    const leaderboard = playersList.slice(0, 10).map(p => ({
      code: p.code,
      player_name: p.playerName,
      avatar: p.avatar,
      stars: p.stars,
      updated_at: p.updated_at
    }));

    return res.status(200).json({
      success: true,
      db_type: 'Vercel Serverless Cloud',
      db_file: 'Vercel Edge Store',
      total_players: playersList.length,
      total_games_logged: (db.logs || []).length,
      leaderboard
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
