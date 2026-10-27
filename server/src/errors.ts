import type { ErrorRequestHandler } from "express";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error = err;
  if (err?.type === "entity.parse.failed") {
    error = new ApiError(400, "invalid_request", "İstek okunamadı.");
  } else if (!(err instanceof ApiError)) {
    console.error(err);
    error = new ApiError(500, "internal_error", "Beklenmeyen bir hata oluştu.");
  }
  res.status(error.status).json({ error: { code: error.code, message: error.message } });
};
