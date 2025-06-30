const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    statusCode: 500,
    message: 'Internal Server Error'
  };

  // File not found errors
  if (err.code === 'ENOENT') {
    error = {
      statusCode: 404,
      message: 'Required file not found'
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      statusCode: 400,
      message: 'Validation Error',
      details: err.message
    };
  }

  // Image processing errors
  if (err.message?.includes('Canvas') || err.message?.includes('Image')) {
    error = {
      statusCode: 500,
      message: 'Image processing error'
    };
  }

  res.status(error.statusCode).json({
    error: error.message,
    ...(error.details && { details: error.details })
  });
};

module.exports = { errorHandler }; 