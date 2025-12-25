const express = require("express");
const multer = require("multer");
const path = require("path");

const qagController = require("../controllers/qag.controller");
const { methodNotAllowed } = require("../controllers/error.controller");

// Setup multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'text/plain'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only PDF or TXT allowed'));
    cb(null, true);
  }
});

const qagRouter = express.Router();

module.exports.setup = (app) => {
  // base path cho module QAG
  app.use("/api/v1/qg", qagRouter);

  /**
   * @swagger
   * /api/v1/qg/text:
   *   post:
   *     summary: Generate quiz from raw text
   *     description: Generate quiz questions from a text passage using QAG model
   *     tags:
   *       - qag
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               text:
   *                 type: string
   *                 description: Source text to generate questions from
   *               numQuestions:
   *                 type: integer
   *                 description: Optional number of questions to generate
   *     responses:
   *       200:
   *         description: Generated quiz
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   enum: [success]
   *                 data:
   *                   type: object
   *                   properties:
   *                     quiz:
   *                       type: object
   *                       properties:
   *                         questions:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               question:
   *                                 type: string
   *                               options:
   *                                 type: array
   *                                 items:
   *                                   type: string
   *                               answer_index:
   *                                 type: integer
   *       400:
   *         description: Bad Request
   *         $ref: '#/components/responses/400BadRequest'
   *       500:
   *         description: Internal server error
   *         $ref: '#/components/responses/500InternalServerError'
   */
  qagRouter.post("/text", qagController.qgFromText);

  /**
   * @swagger
   * /api/v1/qg/file:
   *   post:
   *     summary: Generate quiz from uploaded file
   *     description: Upload a PDF or TXT file, extract text and generate quiz using QAG model
   *     tags:
   *       - qag
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: PDF or TXT file
   *     responses:
   *       200:
   *         description: Generated quiz from file
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   enum: [success]
   *                 data:
   *                   type: object
   *                   properties:
   *                     quiz:
   *                       type: object
   *       400:
   *         description: Bad Request
   *         $ref: '#/components/responses/400BadRequest'
   *       500:
   *         description: Internal server error
   *         $ref: '#/components/responses/500InternalServerError'
   */
  qagRouter.post("/file", upload.single("file"), qagController.qgFromFile);

  // method không hỗ trợ
  // qagRouter.all("*", methodNotAllowed);
};
