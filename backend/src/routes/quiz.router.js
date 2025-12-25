const express = require("express");
const quizController = require("../controllers/quiz.controller");

const quizRouter = express.Router();

module.exports.setup = (app) => {
    // base path cho module Quiz
    app.use("/api/v1/quiz", quizRouter);

    /**
     * @swagger
     * /api/v1/quiz:
     *   get:
     *     summary: Get all quizzes for a user
     *     tags: [quiz]
     *     parameters:
     *       - in: query
     *         name: userId
     *         required: true
     *         schema:
     *           type: integer
     */
    quizRouter.get("/", quizController.getUserQuizzes);

    /**
     * @swagger
     * /api/v1/quiz/attempts:
     *   get:
     *     summary: Get user's quiz attempts
     *     tags: [quiz]
     */
    quizRouter.get("/attempts", quizController.getUserAttempts);

    /**
     * @swagger
     * /api/v1/quiz:
     *   post:
     *     summary: Save quiz to database
     *     tags: [quiz]
     */
    quizRouter.post("/", quizController.saveQuiz);

    /**
     * @swagger
     * /api/v1/quiz/{id}:
     *   put:
     *     summary: Update quiz
     *     tags: [quiz]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     */
    quizRouter.put("/:id", quizController.updateQuiz);

    /**
     * @swagger
     * /api/v1/quiz/{id}/detail:
     *   get:
     *     summary: Get quiz detail with statistics
     *     tags: [quiz]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *       - in: query
     *         name: userId
     *         required: true
     *         schema:
     *           type: integer
     */
    quizRouter.get("/:id/detail", quizController.getQuizDetail);

    /**
     * @swagger
     * /api/v1/quiz/{id}/questions:
     *   get:
     *     summary: Get formatted quiz questions
     *     tags: [quiz]
     */
    quizRouter.get("/:id/questions", quizController.getQuizQuestions);

    /**
     * @swagger
     * /api/v1/quiz/{id}/attempt:
     *   post:
     *     summary: Submit quiz attempt
     *     tags: [quiz]
     */
    quizRouter.post("/:id/attempt", quizController.submitQuizAttempt);

    /**
     * @swagger
     * /api/v1/quiz/{id}:
     *   get:
     *     summary: Get quiz by ID
     *     tags: [quiz]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     */
    quizRouter.get("/:id", quizController.getQuiz);

    /**
     * @swagger
     * /api/v1/quiz/{id}:
     *   delete:
     *     summary: Delete quiz (soft delete)
     *     tags: [quiz]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     */
    quizRouter.delete("/:id", quizController.deleteQuiz);
};
