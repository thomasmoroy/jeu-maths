const { getDB, players } = require('../../db/index.js');
const { eq } = require('drizzle-orm');

const memoryFallback = global._memStore || (global._memStore = {});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch(err) {
      body = {};
    }

    const data = body.data || body;
    let code = (body.code || data.code || data.sqlCode || '').trim().toUpperCase();
    const playerName = (data.playerName || data.name || 'Léa').trim();
    const stars = parseInt(data.stars, 10) || 0;

    if (!code) {
      code = `MAGIE-${Math.floor(100 + Math.random() * 900)}`;
      data.code = code;
    }

    const db = getDB();
    if (db) {
      await db.insert(players).values({
        code,
        name: playerName,
        stars,
        data,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: players.code,
        set: {
          name: playerName,
          stars,
          data,
          updatedAt: new Date()
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Netlify Database (Postgres)',
          code,
          playerName,
          stars,
          updated_at: new Date().toISOString()
        })
      };
    } else {
      // Offline / Local dev fallback
      memoryFallback[code] = { code, name: playerName, stars, data, updatedAt: new Date().toISOString() };
      memoryFallback[playerName.toLowerCase()] = memoryFallback[code];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Netlify Local Store',
          code,
          playerName,
          stars
        })
      };
    }
  } catch (error) {
    console.error('Netlify Database Save Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
