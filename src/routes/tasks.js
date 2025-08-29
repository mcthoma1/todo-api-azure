const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Create
router.post('/', async (req, res) => {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (!title) return res.status(400).json({ error: 'title_required' });

        const r = await getPool()
            .request()
            .input('title', sql.NVarChar(200), title)
            .query(`
        INSERT INTO dbo.tasks (title)
        OUTPUT inserted.id, inserted.title, inserted.done, inserted.created_at
        VALUES (@title);
      `);

        const task = r.recordset[0];
        res.status(201).location(`/tasks/${task.id}`).json(task);
    } catch (e) {
        console.error('POST /tasks error:', e.message);
        res.status(500).json({ error: 'db_error' });
    }
});

// List
router.get('/', async (_req, res) => {
    try {
        const r = await getPool().request().query(`
      SELECT id, title, done, created_at FROM dbo.tasks ORDER BY id DESC;
    `);
        res.json(r.recordset);
    } catch (e) {
        console.error('GET /tasks error:', e.message);
        res.status(500).json({ error: 'db_error' });
    }
});

// Read one
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    try {
        const r = await getPool().request().input('id', sql.Int, id).query(`
      SELECT id, title, done, created_at FROM dbo.tasks WHERE id=@id;
    `);
        if (r.recordset.length === 0) return res.status(404).json({ error: 'not_found' });
        res.json(r.recordset[0]);
    } catch (e) {
        console.error('GET /tasks/:id error:', e.message);
        res.status(500).json({ error: 'db_error' });
    }
});

// Toggle done
router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    try {
        const upd = await getPool().request().input('id', sql.Int, id).query(`
      UPDATE dbo.tasks
      SET done = CASE WHEN done=1 THEN 0 ELSE 1 END
      WHERE id=@id;
      SELECT @@ROWCOUNT AS affected;
    `);
        if (!upd.recordset[0] || upd.recordset[0].affected === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        const r = await getPool().request().input('id', sql.Int, id).query(`
      SELECT id, title, done, created_at FROM dbo.tasks WHERE id=@id;
    `);
        res.json(r.recordset[0]);
    } catch (e) {
        console.error('PATCH /tasks/:id error:', e.message);
        res.status(500).json({ error: 'db_error' });
    }
});

// Delete
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    try {
        const del = await getPool().request().input('id', sql.Int, id).query(`
      DELETE FROM dbo.tasks WHERE id=@id;
      SELECT @@ROWCOUNT AS affected;
    `);
        if (!del.recordset[0] || del.recordset[0].affected === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        res.status(204).send();
    } catch (e) {
        console.error('DELETE /tasks/:id error:', e.message);
        res.status(500).json({ error: 'db_error' });
    }
});

module.exports = router;