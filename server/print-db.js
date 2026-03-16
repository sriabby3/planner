'use strict';

const { getDb } = require('./db');

async function main() {
  const db = await getDb();

  const users = await db.all(
    `SELECT id, name, email, created_at
     FROM users
     ORDER BY id DESC
     LIMIT 50`
  );

  const messages = await db.all(
    `SELECT id, user_id, name, email, message, created_at
     FROM messages
     ORDER BY id DESC
     LIMIT 50`
  );

  console.log('\n=== USERS (users) ===');
  console.table(users);

  console.log('\n=== MESSAGES (messages) ===');
  console.table(messages);
}

main().catch((err) => {
  console.error('Failed to print DB data:', err);
  process.exitCode = 1;
});
