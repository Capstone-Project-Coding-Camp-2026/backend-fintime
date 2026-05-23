export function successResponse(
  res,
  {
    message = "Success",
    data = null,
    meta = null,
    statusCode = 200,
  } = {}
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function errorResponse(
  res,
  {
    message = "Server Error",
    errors = null,
    statusCode = 500,
  } = {}
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}