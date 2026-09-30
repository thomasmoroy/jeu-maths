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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const data = body.data || body;
    const playerName = (data.playerName || 'Léa').trim();
    const avatar = data.avatar || '🧙‍♀️';
    const stars = parseInt(data.stars, 10) || 0;
    const streakRecord = parseInt(data.streakRecord, 10) || 0;
    const chronoRecord = parseInt(data.chronoRecord, 10) || 0;
    const petType = data.currentPetType || 'flammy';
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NETLIFY_NEON_DATABASE_URL;

    if (dbUrl) {
      const sql = neon(dbUrl);

      // Auto-initialize table if needed
      await sql`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          player_name VARCHAR(100) UNIQUE NOT NULL,
          avatar VARCHAR(50) DEFAULT '🧙‍♀️',
          stars INTEGER DEFAULT 0,
          streak_record INTEGER DEFAULT 0,
          chrono_record INTEGER DEFAULT 0,
          pet_type VARCHAR(50) DEFAULT 'flammy',
          save_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // Upsert player record into Neon PostgreSQL
      await sql`
        INSERT INTO players (player_name, avatar, stars, streak_record, chrono_record, pet_type, save_data, updated_at)
        VALUES (${playerName}, ${avatar}, ${stars}, ${streakRecord}, ${chronoRecord}, ${petType}, ${JSON.stringify(data)}, CURRENT_TIMESTAMP)
        ON CONFLICT (player_name) DO UPDATE SET
          avatar = EXCLUDED.avatar,
          stars = EXCLUDED.stars,
          streak_record = EXCLUDED.streak_record,
          chrono_record = EXCLUDED.chrono_record,
          pet_type = EXCLUDED.pet_type,
          save_data = EXCLUDED.save_data,
          updated_at = CURRENT_TIMESTAMP;
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Neon PostgreSQL (Cloud Serverless)',
          playerName,
          stars
        })
      };
    } else {
      // Memory fallback if Neon extension is not yet configured
      fallbackStore[playerName.toLowerCase()] = data;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Memory Fallback (Activez l extension Neon sur Netlify)',
          playerName,
          stars
        })
      };
    }
  } catch (error) {
    console.error('Neon save error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
