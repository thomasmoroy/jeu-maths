const { getDB, players } = require('../../db/index.js');
const { eq, or, sql } = require('drizzle-orm');

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
    const googleId = (body.googleId || data.googleId || '').trim();
    const email = (body.email || data.email || '').trim().toLowerCase();
    let code = (body.code || data.code || data.sqlCode || '').trim().toUpperCase();
    const playerName = (data.playerName || data.name || 'Léa').trim();
    const stars = parseInt(data.stars, 10) || 0;

    if (!code) {
      code = googleId ? `G-${googleId.slice(-6)}` : `MAGIE-${Math.floor(100 + Math.random() * 900)}`;
      data.code = code;
    }
    if (googleId) data.googleId = googleId;
    if (email) data.email = email;

    const db = getDB();
    if (db) {
      // 1. If Google User, search by googleId or email
      if (googleId) {
        const existing = await db.select().from(players).where(
          or(eq(players.googleId, googleId), email ? eq(players.email, email) : undefined)
        ).limit(1);

        if (existing.length > 0) {
          await db.update(players).set({
            googleId,
            email: email || existing[0].email,
            name: playerName,
            stars,
            data,
            updatedAt: new Date()
          }).where(eq(players.id, existing[0].id));

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              db: 'Netlify PostgreSQL (Google Account)',
              googleId,
              email,
              playerName,
              stars
            })
          };
        }
      }

      // 2. Standard upsert by code
      await db.insert(players).values({
        googleId: googleId || null,
        email: email || null,
        code,
        name: playerName,
        stars,
        data,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: players.code,
        set: {
          googleId: googleId || sql`excluded.google_id`,
          email: email || sql`excluded.email`,
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
          db: 'Netlify PostgreSQL',
          code,
          googleId: googleId || null,
          email: email || null,
          playerName,
          stars,
          updated_at: new Date().toISOString()
        })
      };
    } else {
      const key = googleId || email || code || playerName.toLowerCase();
      memoryFallback[key] = { googleId, email, code, name: playerName, stars, data, updatedAt: new Date().toISOString() };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Memory Fallback',
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
