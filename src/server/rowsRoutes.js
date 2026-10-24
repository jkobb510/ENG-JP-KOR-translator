const express = require('express');
const { pool, requireDatabase } = require('./database');

const router = express.Router();
const rowColumns = ['word', 'translation', 'translation2', 'furigana', 'image', 'audio'];

function rowValues(body) {
  return rowColumns.map(column => {
    if (body?.[column] !== null && body?.[column] !== undefined) {
      return body[column];
    }
    if (column === 'image' || column === 'audio') return null;
    return '';
  });
}

router.get('/', requireDatabase, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ${rowColumns.join(', ')} FROM study_rows ORDER BY id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Load rows failed:', error);
    res.status(500).json({ error: 'Failed to load rows.' });
  }
});

router.post('/', requireDatabase, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO study_rows (${rowColumns.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      rowValues(req.body)
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create row failed:', error);
    res.status(500).json({ error: 'Failed to create row.' });
  }
});

router.put('/:id', requireDatabase, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

  try {
    const assignments = rowColumns.map((column, index) => `${column} = $${index + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE study_rows SET ${assignments}, updated_at = now() WHERE id = $7`,
      [...rowValues(req.body), id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Row not found.' });
    res.json({ id });
  } catch (error) {
    console.error('Update row failed:', error);
    res.status(500).json({ error: 'Failed to update row.' });
  }
});

router.delete('/:id', requireDatabase, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

  try {
    await pool.query('DELETE FROM study_rows WHERE id = $1', [id]);
    res.status(204).end();
  } catch (error) {
    console.error('Delete row failed:', error);
    res.status(500).json({ error: 'Failed to delete row.' });
  }
});

router.delete('/', requireDatabase, async (_req, res) => {
  try {
    await pool.query('TRUNCATE study_rows');
    res.status(204).end();
  } catch (error) {
    console.error('Clear rows failed:', error);
    res.status(500).json({ error: 'Failed to clear rows.' });
  }
});

module.exports = router;