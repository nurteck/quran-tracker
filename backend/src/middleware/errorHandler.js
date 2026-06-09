export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: { code: err.code || 'INTERNAL', message: err.message || 'Internal server error' } });
}