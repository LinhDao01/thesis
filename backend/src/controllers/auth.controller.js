// const ApiError = require("../../api-error");
// const JSend = require("../../jsend");
// const authService = require("../services/auth.service");

// /**
//  * POST /api/auth/login
//  * Body: { email, password }
//  */
// async function login(req, res, next) {
//   const { email, password } = req.body || {};

//   if (!email || !password) {
//     return next(new ApiError(400, "Email and password are required"));
//   }

//   try {
//     const result = await authService.login(email, password);
//     if (!result) {
//       return next(new ApiError(401, "Invalid email or password"));
//     }

//     return res.status(200).json(
//       JSend.success({
//         token: result.token,
//         user: result.user,
//       })
//     );
//   } catch (error) {
//     console.log(error);
//     return next(
//       new ApiError(
//         error.status || 500,
//         error.message || "Unknown error occurred while logging in"
//       )
//     );
//   }
// }

// /**
//  * POST /api/auth/register
//  * Body: { email, password, name }
//  */
// async function register(req, res, next) {
//   const { email, password, name } = req.body || {};

//   if (!email || !password || !name) {
//     return next(new ApiError(400, "Email, password, and name are required"));
//   }

//   try {
//     const result = await authService.register(email, password, name);
//     if (!result) {
//       return next(new ApiError(409, "User with this email already exists"));
//     }

//     return res.status(200).json(
//       JSend.success({
//         token: result.token,
//         user: result.user,
//       })
//     );
//   } catch (error) {
//     console.log(error);
//     return next(
//       new ApiError(
//         error.status || 500,
//         error.message || "Unknown error occurred while registering"
//       )
//     );
//   }
// }

// module.exports = {
//   login,
//   register,
// };

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const JSend = require('../../jsend');
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/v1/auth/register
router.post(
  '/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(JSend.fail('Validation failed', { errors: errors.array() }));
    }

    try {
      const { name, email, password } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res
          .status(400)
          .json(JSend.fail('Email already exists'));
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashed },
      });

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1d' }
      );

      return res.status(200).json(
        JSend.success({
          token,
          user: { id: user.id, name: user.name, email: user.email },
        })
      );
    } catch (err) {
      console.error('Registration error:', err);
      return res
        .status(500)
        .json(JSend.error('Registration failed'));
    }
  }
);

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json(JSend.fail('Email and password are required'));
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json(JSend.fail('Invalid credentials'));
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res
        .status(401)
        .json(JSend.fail('Invalid credentials'));
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1d' }
    );

    return res.status(200).json(
      JSend.success({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      })
    );
  } catch (err) {
    console.error('Login error:', err);
    return res
      .status(500)
      .json(JSend.error('Login failed'));
  }
});

module.exports = router;
