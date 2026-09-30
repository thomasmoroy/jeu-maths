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
    const queryKey = (params.code || params.name || params.player || '').trim();

    if (!queryKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Paramètre code ou nom manquant' })
      };
    }

    const upperKey = queryKey.toUpperCase();
    const db = getDB();

    if (db) {
      // Find by code OR case-insensitive name
      const rows = await db.select().from(players).where(
        or(
          eq(players.code, upperKey),
          sql`LOWER(${players.name}) = LOWER(${queryKey})`
        )
      ).limit(1);

      if (rows.length > 0) {
        const p = rows[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Netlify Database (Postgres)',
            code: p.code,
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
            error: `Joueur '${queryKey}' introuvable dans Netlify Database`
          })
        };
      }
    } else {
      const p = memoryFallback[upperKey] || memoryFallback[queryKey.toLowerCase()];
      if (p) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Netlify Local Store',
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
        body: JSON.stringify({ success: false, error: `Joueur '${queryKey}' introuvable` })
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
