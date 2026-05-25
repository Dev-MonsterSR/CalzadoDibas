export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'El archivo es demasiado grande. Máximo 5MB para imágenes.' });
  }

  // Validation errors from express-validator
  if (err.errors) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: err.errors
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
