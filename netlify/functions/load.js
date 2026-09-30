const { neon } = require('@neondatabase/serverless');

const fallbackStore = global._memStore || (global._memStore = {});

function getDbClient() {
  const dbUrl = process.env.DATABASE_URL ||
                process.env.NETLIFY_DATABASE_URL ||
                process.env.NEON_DATABASE_URL ||
                process.env.NETLIFY_NEON_DATABASE_URL;
  if (!dbUrl) return null;
  return neon(dbUrl);
}

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

    const upperCode = queryKey.toUpperCase();
    const sql = getDbClient();

    if (sql) {
      // 1. If Google User, lookup by google_id or email
      if (googleId || email) {
        const rowsByGoogle = await sql`
          SELECT save_data, updated_at, stars, avatar, name, code, google_id, email
          FROM players
          WHERE (google_id = ${googleId || null} AND ${googleId !== ''})
             OR (email = ${email || null} AND ${email !== ''})
          LIMIT 1;
        `;

        if (rowsByGoogle.length > 0) {
          const r = rowsByGoogle[0];
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              db: 'Neon PostgreSQL (Google Account)',
              code: r.code,
              googleId: r.google_id,
              email: r.email,
              name: r.name,
              stars: r.stars,
              avatar: r.avatar,
              data: r.save_data,
              updated_at: r.updated_at
            })
          };
        }
      }

      // 2. Lookup by code OR by name (case-insensitive)
      const rows = await sql`
        SELECT save_data, updated_at, stars, avatar, name, code, google_id, email
        FROM players
        WHERE code = ${upperCode}
           OR LOWER(name) = LOWER(${queryKey})
        LIMIT 1;
      `;

      if (rows.length > 0) {
        const r = rows[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            db: 'Neon PostgreSQL',
            code: r.code,
            googleId: r.google_id,
            email: r.email,
            name: r.name,
            stars: r.stars,
            avatar: r.avatar,
            data: r.save_data,
            updated_at: r.updated_at
          })
        };
      } else {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Aucun joueur trouvé avec l'identifiant '${queryKey || email || googleId}'`
          })
        };
      }
    } else {
      const key = googleId || email || upperCode || queryKey.toLowerCase();
      const p = fallbackStore[key];
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
        body: JSON.stringify({ success: false, error: 'Compte introuvable' })
      };
    }
  } catch (error) {
    console.error('Load Handler Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
