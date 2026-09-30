const { drizzle } = require("drizzle-orm/netlify-db");
const schema = require("./schema.js");

let _db = null;
function getDB() {
  if (!_db) {
    try {
      _db = drizzle({ schema });
    } catch (e) {
      console.warn("Netlify Database client initialization:", e.message);
    }
  }
  return _db;
}

module.exports = { getDB, ...schema };
