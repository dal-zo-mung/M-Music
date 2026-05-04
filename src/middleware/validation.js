import mongoose from 'mongoose';

export function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = typeof req.params[paramName] === 'string' ? req.params[paramName].trim() : '';

    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource identifier.'
      });
    }

    req.params[paramName] = value;
    next();
  };
}
