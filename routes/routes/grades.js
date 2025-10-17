// routes/grades.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET grades. ?studentId= or ?class=
router.get('/', auth, async (req, res) => {
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;
  const className = req.query.class || null;
  try {
    if (studentId) {
      const [rows] = await pool.query('SELECT * FROM grades WHERE student_id = ? ORDER BY created_at DESC', [studentId]);
      return res.json(rows);
    }
    if (className) {
      const [rows] = await pool.query(
        `SELECT g.* FROM grades g JOIN users u ON g.student_id = u.id WHERE u.class = ? ORDER BY g.created_at DESC`,
        [className]
      );
      return res.json(rows);
    }
    const [rows] = await pool.query('SELECT * FROM grades ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add grade (teacher or admin)
router.post('/', auth, async (req, res) => {
  const { student_id, subject, score, term } = req.body;
  if (!student_id || !subject || score == null) return res.status(400).json({ error: 'Missing fields' });

  // only teacher or admin can add grades
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  try {
    const [r] = await pool.query('INSERT INTO grades (student_id, subject, score, term) VALUES (?,?,?,?)', [student_id, subject, score, term || null]);
    const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [r.insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
