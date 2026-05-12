export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack)
  } else {
    console.error(message)
  }
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Cannot ${req.method} ${req.path}` })
}
