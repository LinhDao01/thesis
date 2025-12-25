  const ApiError = require("../api-error");
  const jwt = require("jsonwebtoken");

  function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
      return next(new ApiError(400, "Access denied. No token provided!"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Gán thông tin người dùng vào request
      next();
    } catch (error) {
      res.clearCookie("token");
      // return res.redirect("/");
      return next(new ApiError(403, "Invalid or expired token!"));
    }
  }

  module.exports = authMiddleware;