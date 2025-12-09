const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'xp.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS xp (
    userId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    PRIMARY KEY (userId, guildId)
  )`);
});

function updateXP(userId, guildId, amount, callback) {
  db.get(`SELECT * FROM xp WHERE userId = ? AND guildId = ?`, [userId, guildId], (err, row) => {
    if (err) return callback(err);

    if (!row) {
      db.run(`INSERT INTO xp (userId, guildId, xp, level) VALUES (?, ?, ?, ?)`,
        [userId, guildId, amount, 1], (err2) => {
          if (err2) return callback(err2);
          callback(null, { xp: amount, level: 1, levelUp: false });
        });
    } else {
      let newXP = row.xp + amount;
      let level = row.level;
      let nextLevelXP = 5 * (level ** 2) + 50 * level + 100;
      let levelUp = false;

      if (newXP >= nextLevelXP) {
        newXP -= nextLevelXP;
        level += 1;
        levelUp = true;
      }

      db.run(`UPDATE xp SET xp = ?, level = ? WHERE userId = ? AND guildId = ?`,
        [newXP, level, userId, guildId], (err3) => {
          if (err3) return callback(err3);
          callback(null, { xp: newXP, level, levelUp });
        });
    }
  });
}

function getXP(userId, guildId, callback) {
  db.get(`SELECT * FROM xp WHERE userId = ? AND guildId = ?`, [userId, guildId], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(null, { xp: 0, level: 1 });
    callback(null, row);
  });
}

function getTopXP(guildId, limit = 10, callback) {
  db.all(
    `SELECT userId, xp, level FROM xp WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT ?`,
    [guildId, limit],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    }
  );
}

module.exports = {
  updateXP,
  getXP,
  getTopXP
};



