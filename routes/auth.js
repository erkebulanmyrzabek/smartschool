// routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, class: cls, subject } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ success:false, message: 'Missing fields' });
  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(400).json({ success:false, message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, class, subject) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, role, cls || null, subject || null]
    );
    const userId = result.insertId;
    res.json({ success:true, message: 'Registered', user: { id: userId, name, email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message: 'Missing fields' });
  try {
    const [rows] = await pool.query('SELECT id, name, email, password_hash, role, class, subject FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(400).json({ success:false, message: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(400).json({ success:false, message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success:true, token, user: { id:user.id, name:user.name, email:user.email, role:user.role, class:user.class, subject:user.subject } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// Me (get user from token)
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success:false, message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId;
    const [rows] = await pool.query('SELECT id, name, email, role, class, subject FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success:false, message: 'User not found' });
    res.json({ success:true, user: rows[0] });
  } catch (err) {
    return res.status(401).json({ success:false, message: 'Invalid token' });
  }
});

module.exports = router;
