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

  try {
    const params = event.queryStringParameters || {};
    const googleId = (params.googleId || params.google_id || '').trim();
    const email = (params.email || '').trim().toLowerCase();
    const queryKey = (params.code || params.name || params.player || '').trim();

    if (!googleId && !email && !queryKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Paramètre googleId, email, code ou nom manquant' })
      };
    }

    const upperKey = queryKey ? queryKey.toUpperCase() : '';
    const db = getDB();

    if (db) {
      const conditions = [];
      if (googleId) conditions.push(eq(players.googleId, googleId));
      if (email) conditions.push(eq(players.email, email));
      if (upperKey) conditions.push(eq(players.code, upperKey));
      if (queryKey) conditions.push(sql`LOWER(${players.name}) = LOWER(${queryKey})`);

      const rows = await db.select().from(players).where(or(...conditions)).limit(1);

      if (rows.length > 0) {
        const p = rows[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Netlify PostgreSQL',
            code: p.code,
            googleId: p.googleId,
            email: p.email,
            name: p.name,
            stars: p.stars,
            data: p.data,
            updated_at: p.updatedAt
          })
        };
      } else {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Aucun compte trouvé`
          })
        };
      }
    } else {
      const key = googleId || email || upperKey || queryKey.toLowerCase();
      const p = memoryFallback[key];
      if (p) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Memory Fallback',
            code: p.code,
            name: p.name,
            stars: p.stars,
            data: p.data,
            updated_at: p.updatedAt
          })
        };
      }
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: `Compte introuvable` })
      };
    }
  } catch (error) {
    console.error('Netlify Database Load Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
