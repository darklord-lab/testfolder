const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_PATH || 'database.db');
const db = new DatabaseSync(dbPath);

// Read and execute the schema file to initialize the database tables
const schemaPath = path.resolve(__dirname, '../schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
} else {
  console.warn('schema.sql file not found at:', schemaPath);
}

module.exports = {
  /**
   * Helper function mimicking standard pg pool query behavior.
   * This facilitates switching to PostgreSQL in production.
   */
  query: (text, params = []) => {
    try {
      const stmt = db.prepare(text);
      const trimmedText = text.trim().toUpperCase();
      const isSelect = trimmedText.startsWith('SELECT') || trimmedText.startsWith('WITH');
      
      if (isSelect) {
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const result = stmt.run(...params);
        return {
          rows: [],
          insertId: result.lastInsertRowid,
          affectedRows: result.changes
        };
      }
    } catch (err) {
      console.error('Database Query Error:', err);
      console.error('Statement:', text);
      console.error('Parameters:', params);
      throw err;
    }
  }
};
