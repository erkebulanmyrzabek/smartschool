// routes/chat.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const auth = require('./middleware/auth');

// GET messages. If ?userId provided, include private messages to/from that user
router.get('/', auth, async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  try {
    if (userId) {
      const [rows] = await pool.query(
        `SELECT * FROM chats
         WHERE is_private = 0
            OR (is_private = 1 AND (private_to_id = ? OR sender_id = ?))
         ORDER BY created_at ASC
         LIMIT 100`, [userId, userId]
      );
      return res.json(rows);
    } else {
      const [rows] = await pool.query('SELECT * FROM chats WHERE is_private = 0 ORDER BY created_at ASC LIMIT 200');
      return res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST message (only authenticated)
router.post('/', auth, async (req, res) => {
  // body: text, is_private (bool), private_to_id (nullable)
  const { text, is_private, private_to_id } = req.body;
  if (!text || text.trim() === '') return res.status(400).json({ error: 'Empty message' });
  try {
    // get sender info
    const [urows] = await pool.query('SELECT id, name FROM users WHERE id = ?', [req.user.userId]);
    if (!urows.length) return res.status(400).json({ error: 'Sender not found' });
    const sender = urows[0];
    const [r] = await pool.query(
      'INSERT INTO chats (sender_id, sender_name, text, is_private, private_to_id) VALUES (?,?,?,?,?)',
      [sender.id, sender.name, text, is_private ? 1 : 0, private_to_id || null]
    );
    const [rows] = await pool.query('SELECT * FROM chats WHERE id = ?', [r.insertId]);
    // return the message row (server will broadcast via socket.io)
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
