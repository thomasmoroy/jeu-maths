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
    const avatar = data.avatar || '🧙‍♀️';
    const stars = parseInt(data.stars, 10) || 0;
    const streakRecord = parseInt(data.streakRecord, 10) || 0;
    const chronoRecord = parseInt(data.chronoRecord, 10) || 0;
    const petType = data.currentPetType || 'flammy';

    if (!code) {
      code = googleId ? `G-${googleId.slice(-6)}` : `MAGIE-${Math.floor(100 + Math.random() * 900)}`;
      data.code = code;
    }
    if (googleId) data.googleId = googleId;
    if (email) data.email = email;

    const sql = getDbClient();

    if (sql) {
      // 1. Ensure Table Exists
      await sql`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          google_id TEXT UNIQUE,
          email TEXT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          avatar TEXT DEFAULT '🧙‍♀️',
          stars INT DEFAULT 0,
          streak_record INT DEFAULT 0,
          chrono_record INT DEFAULT 0,
          pet_type TEXT DEFAULT 'flammy',
          save_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 2. If Google User, search and update by google_id or email
      if (googleId || email) {
        const existing = await sql`
          SELECT id FROM players
          WHERE (google_id = ${googleId || null} AND ${googleId !== ''})
             OR (email = ${email || null} AND ${email !== ''})
          LIMIT 1;
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE players SET
              google_id = COALESCE(${googleId || null}, google_id),
              email = COALESCE(${email || null}, email),
              name = ${playerName},
              avatar = ${avatar},
              stars = ${stars},
              streak_record = ${streakRecord},
              chrono_record = ${chronoRecord},
              pet_type = ${petType},
              save_data = ${JSON.stringify(data)},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existing[0].id};
          `;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              db: 'Neon PostgreSQL (Google Account)',
              googleId,
              email,
              playerName,
              stars
            })
          };
        }
      }

      // 3. Search by name (case-insensitive) or code
      const existingByName = await sql`
        SELECT id FROM players
        WHERE code = ${code} OR LOWER(name) = LOWER(${playerName})
        LIMIT 1;
      `;

      if (existingByName.length > 0) {
        await sql`
          UPDATE players SET
            google_id = COALESCE(${googleId || null}, google_id),
            email = COALESCE(${email || null}, email),
            code = ${code},
            name = ${playerName},
            avatar = ${avatar},
            stars = ${stars},
            streak_record = ${streakRecord},
            chrono_record = ${chronoRecord},
            pet_type = ${petType},
            save_data = ${JSON.stringify(data)},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${existingByName[0].id};
        `;
      } else {
        await sql`
          INSERT INTO players (google_id, email, code, name, avatar, stars, streak_record, chrono_record, pet_type, save_data, updated_at)
          VALUES (${googleId || null}, ${email || null}, ${code}, ${playerName}, ${avatar}, ${stars}, ${streakRecord}, ${chronoRecord}, ${petType}, ${JSON.stringify(data)}, CURRENT_TIMESTAMP);
        `;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Neon PostgreSQL',
          code,
          playerName,
          stars,
          updated_at: new Date().toISOString()
        })
      };
    } else {
      // Memory fallback for local testing
      const key = googleId || email || code || playerName.toLowerCase();
      fallbackStore[key] = { googleId, email, code, name: playerName, stars, data, updatedAt: new Date().toISOString() };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Netlify Local Memory',
          code,
          playerName,
          stars
        })
      };
    }
  } catch (error) {
    console.error('Save Handler Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
