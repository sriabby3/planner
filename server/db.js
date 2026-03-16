const path = require('path');
const fs = require('fs');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, 'planner.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    const db = await dbPromise;
    await db.exec('PRAGMA foreign_keys = ON;');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await db.exec(schema);
  }

  return dbPromise;
}

module.exports = {
  getDb,
};
