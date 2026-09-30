const { pgTable, serial, text, integer, jsonb, timestamp } = require("drizzle-orm/pg-core");

const players = pgTable("players", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  stars: integer("stars").notNull().default(0),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

module.exports = { players };
