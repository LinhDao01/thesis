const express = require("express");
const authRouter = require("../controllers/auth.controller");

module.exports.setup = (app) => {
  // Mount auth router exported from controller
  app.use("/api/v1/auth", authRouter);
};
