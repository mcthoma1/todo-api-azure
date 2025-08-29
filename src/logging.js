// Logs one line per request: "METHOD PATH STATUS latencyMs"
module.exports = function requestLogger(req, res, next) {
    // High-resolution start time (nanoseconds as BigInt)
    const start = process.hrtime.bigint();

    // When the response has been sent, compute duration and log
    res.on('finish', () => {
        // Convert nanoseconds → milliseconds
        const durMs = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durMs.toFixed(1)}ms`);
    });

    // Hand off control to the next middleware/route
    next();
};