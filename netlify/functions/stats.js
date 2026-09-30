const { neon } = require('@neondatabase/serverless');

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDbClient();
    if (sql) {
      const countRes = await sql`SELECT count(*) as total FROM players;`;
      const leaderboard = await sql`
        SELECT code, name as player_name, avatar, stars, updated_at
        FROM players
        ORDER BY stars DESC
        LIMIT 10;
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db_type: 'Neon PostgreSQL Serverless',
          total_players: parseInt(countRes[0]?.total || 0, 10),
          leaderboard
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db_type: 'Local Memory',
          total_players: 1,
          leaderboard: []
        })
      };
    }
  } catch (error) {
    console.error('Stats Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
