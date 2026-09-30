const { neon } = require('@neondatabase/serverless');

const fallbackStore = global._neonFallbackStore || (global._neonFallbackStore = {});

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
    const name = (params.name || params.player || params.code || '').trim();

    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Nom du joueur manquant' })
      };
    }

    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NETLIFY_NEON_DATABASE_URL;

    if (dbUrl) {
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT save_data, updated_at, stars, avatar, player_name
        FROM players
        WHERE LOWER(player_name) = LOWER(${name})
        LIMIT 1;
      `;

      if (rows.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Neon PostgreSQL',
            updated_at: rows[0].updated_at,
            data: rows[0].save_data
          })
        };
      } else {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Aucun joueur trouvé avec le nom '${name}' dans Neon Postgres`
          })
        };
      }
    } else {
      const saved = fallbackStore[name.toLowerCase()];
      if (saved) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Memory Fallback',
            data: saved
          })
        };
      }
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Joueur introuvable' })
      };
    }
  } catch (error) {
    console.error('Neon load error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
