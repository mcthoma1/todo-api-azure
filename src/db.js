const sql = require('mssql');

// 1) Read DB settings from environment variables (with safe defaults for Docker Compose)
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS || 'YourStrong!Passw0rd',
    server: process.env.DB_HOST || 'sqlserver', // service name from docker-compose
    database: process.env.DB_NAME || 'master',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: false,              // local dev against container; not TLS
        trustServerCertificate: true // accept self-signed certs in dev
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool; // holds our single shared connection pool

// 2) Try to connect a few times (SQL container can take time to be ready)
async function connectWithRetry(cfg, attempts = 30, delayMs = 2000) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            const p = new sql.ConnectionPool(cfg);
            const connected = await p.connect(); // opens the pool
            console.log('Connected to SQL Server');
            return connected;
        } catch (e) {
            lastErr = e;
            console.warn(`DB connect attempt ${i}/${attempts} failed: ${e.message}`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw lastErr; // after all tries, bubble the last error
}

// 3) Initialize DB on startup (called from server.js)
async function initDb() {
    pool = await connectWithRetry(config);
    await ensureTasksTable(); // create table if missing
    return pool;
}

// 4) Helper to get the pool later in routes
function getPool() {
    if (!pool) throw new Error('DB pool not initialized');
    return pool;
}

// 5) Create the tasks table only if it does not exist (idempotent)
async function ensureTasksTable() {
    const ddl = `
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[tasks]') AND type = N'U'
)
BEGIN
  CREATE TABLE dbo.tasks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    done BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
`;
    await getPool().request().query(ddl);
    console.log('Ensured dbo.tasks table exists');
}

module.exports = { sql, initDb, getPool };