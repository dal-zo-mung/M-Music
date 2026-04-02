function errorhandler(err, req, res, next) {
    console.error(err && err.stack ? err.stack : err);

    const statusCode = err && err.statusCode ? err.statusCode : 500;
    const payload = {
        success: false,
        status: statusCode,
        error: err && err.message ? err.message : 'Internal Server Error'
    };

    if (process.env.NODE_ENV !== 'production' && err && err.stack) {
        payload.stack = err.stack;
    }

    if (res.headersSent) return next(err);
    res.status(statusCode).json(payload);
}

export default errorhandler;