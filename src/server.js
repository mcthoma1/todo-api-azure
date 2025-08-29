/* Initialize Application Insights BEFORE Express */
require('dotenv').config();
const appInsights = require('applicationinsights');

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup().start(); // auto-collects HTTP requests, exceptions, deps
}

const express = require('express');
const logging = require('./logging');
const healthRouter = require('./routes/health');
const tasksRouter = require('./routes/tasks');
const { initDb } = require('./db');

const app = express();
app.use(express.json());
app.use(logging);

app.use(healthRouter);
app.use('/tasks', tasksRouter);

// Global error handler: never crash; return JSON
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'internal_error' });
});

// Initialize DB (idempotent); skip during tests
(async () => {
    if (process.env.SKIP_DB_INIT === '1') return;
    try {
        await initDb();
    } catch (e) {
        console.error('DB init failed (API still running):', e.message);
    }
})();

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`todo-api-azure listening on :${PORT}`));
}

module.exports = app;