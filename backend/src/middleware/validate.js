import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: first.msg,
        details: errors.array(),
      },
    });
  }
  next();
}
