const { neon } = require('@neondatabase/serverless');

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
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NETLIFY_NEON_DATABASE_URL;

    if (dbUrl) {
      const sql = neon(dbUrl);
      const countRes = await sql`SELECT COUNT(*) as total FROM players;`;
      const leaderboard = await sql`
        SELECT player_name, avatar, stars, updated_at
        FROM players
        ORDER BY stars DESC
        LIMIT 10;
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Neon PostgreSQL Serverless',
          total_players: parseInt(countRes[0].total, 10),
          leaderboard
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db: 'Neon Non Connecté (Ajoutez DATABASE_URL sur Netlify)',
          total_players: 0,
          leaderboard: []
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
