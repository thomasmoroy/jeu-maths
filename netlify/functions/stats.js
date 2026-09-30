const { getDB, players } = require('../../db/index.js');
const { sql, desc } = require('drizzle-orm');

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
    const db = getDB();
    if (db) {
      const countRes = await db.select({ total: sql`count(*)` }).from(players);
      const topList = await db.select().from(players).orderBy(desc(players.stars)).limit(10);

      const leaderboard = topList.map(p => ({
        code: p.code,
        player_name: p.name,
        stars: p.stars,
        avatar: p.data?.avatar || '🧙‍♀️',
        updated_at: p.updatedAt
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db_type: 'Netlify Database (Postgres Drizzle)',
          total_players: Number(countRes[0]?.total || 0),
          leaderboard
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          db_type: 'Netlify Local Memory',
          total_players: 1,
          leaderboard: []
        })
      };
    }
  } catch (error) {
    console.error('Netlify Database Stats Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
