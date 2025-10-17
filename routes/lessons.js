// routes/lessons.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const auth = require('./middleware/auth');

// GET lessons (optionally ?teacherId=)
router.get('/', auth, async (req, res) => {
  const teacherId = req.query.teacherId ? Number(req.query.teacherId) : null;
  try {
    if (teacherId) {
      const [rows] = await pool.query('SELECT * FROM lessons WHERE teacher_id = ? ORDER BY lesson_date, lesson_time', [teacherId]);
      return res.json(rows);
    }
    const [rows] = await pool.query('SELECT * FROM lessons ORDER BY lesson_date, lesson_time');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add lesson (only teachers or admins)
router.post('/', auth, async (req, res) => {
  const { subject, lesson_date, lesson_time, topic, teacher_id } = req.body;
  // If teacher posts, ensure they are that teacher (or admin)
  try {
    // role check
    if (req.user.role === 'teacher') {
      // teacher can only add for themselves
      if (teacher_id && teacher_id !== req.user.userId) return res.status(403).json({ error: 'Cannot add lesson for other teacher' });
    } else if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teacher or admin can add lessons' });
    }

    // get teacher name
    const tId = teacher_id || req.user.userId;
    const [trows] = await pool.query('SELECT id, name FROM users WHERE id = ?', [tId]);
    if (!trows.length) return res.status(400).json({ error: 'Teacher not found' });
    const teacherName = trows[0].name;

    if (!subject || !lesson_date || !lesson_time) return res.status(400).json({ error: 'Missing fields' });

    const [r] = await pool.query(
      'INSERT INTO lessons (subject, teacher_id, teacher_name, lesson_date, lesson_time, topic) VALUES (?,?,?,?,?,?)',
      [subject, tId, teacherName, lesson_date, lesson_time, topic || null]
    );
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [r.insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
