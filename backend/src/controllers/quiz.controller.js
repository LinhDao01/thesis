const ApiError = require("../../api-error");
const JSend = require("../../jsend");
const quizService = require('../services/quiz.service');

/**
 * GET /api/v1/quiz/:id
 * Get quiz by ID
 */
async function getQuiz(req, res, next) {
    try {
        const quizId = req.params.id;
        const quiz = await quizService.getQuizById(quizId);

        if (!quiz) {
            return next(new ApiError(404, "Quiz not found"));
        }

        return res.status(200).json(
            JSend.success({ quiz })
        );
    } catch (error) {
        console.error('Error getting quiz:', error);
        return next(
            new ApiError(500, error.message || "Failed to get quiz")
        );
    }
}

/**
 * GET /api/v1/quiz/:id/questions
 * Get formatted quiz questions for frontend
 */
async function getQuizQuestions(req, res, next) {
    try {
        const quizId = req.params.id;
        const questions = await quizService.getQuizQuestions(quizId);

        return res.status(200).json(
            JSend.success({ questions })
        );
    } catch (error) {
        console.error('Error getting quiz questions:', error);
        return next(
            new ApiError(500, error.message || "Failed to load quiz questions")
        );
    }
}

/**
 * POST /api/v1/quiz
 * Save quiz to database
 */
async function saveQuiz(req, res, next) {
    try {
        const { userId, title, questions } = req.body;

        if (!userId || !title || !questions || !Array.isArray(questions)) {
            return next(new ApiError(400, "userId, title, and questions array are required"));
        }

        const quiz = await quizService.saveQuiz(userId, title, questions);

        return res.status(201).json(
            JSend.success({ quiz })
        );
    } catch (error) {
        console.error('Error saving quiz:', error);
        return next(
            new ApiError(500, error.message || "Failed to save quiz")
        );
    }
}

/**
 * PUT /api/v1/quiz/:id
 * Update quiz
 */
async function updateQuiz(req, res, next) {
    try {
        const quizId = req.params.id;
        const { userId, title, questions } = req.body;

        if (!userId || !title || !questions || !Array.isArray(questions)) {
            return next(new ApiError(400, "userId, title, and questions array are required"));
        }

        const quiz = await quizService.updateQuiz(quizId, userId, title, questions);

        return res.status(200).json(
            JSend.success({ quiz })
        );
    } catch (error) {
        console.error('Error updating quiz:', error);
        return next(
            new ApiError(500, error.message || "Failed to update quiz")
        );
    }
}

/**
 * POST /api/v1/quiz/:id/attempt
 * Submit quiz attempt
 */
async function submitQuizAttempt(req, res, next) {
    try {
        const quizId = req.params.id;
        const { userId, answers } = req.body;

        if (!userId || !answers || !Array.isArray(answers)) {
            return next(new ApiError(400, "userId and answers array are required"));
        }

        // Get quiz to validate answers
        const quiz = await quizService.getQuizById(quizId);
        if (!quiz) {
            return next(new ApiError(404, "Quiz not found"));
        }

        // Calculate score
        let correctCount = 0;
        const formattedAnswers = answers.map((answer, index) => {
            const question = quiz.questions[index];

            // Check if this is a short answer question (no answers/options)
            const isShortAnswer = !question?.answers || question.answers.length === 0;

            let isCorrect = false;
            if (question) {
                if (isShortAnswer) {
                    // For short answer: compare case-insensitive and trim whitespace
                    // Normalize: trim, lowercase, and remove any control characters
                    const normalize = (str) => {
                        return String(str || '')
                            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, ' '); // Normalize whitespace
                    };

                    const userAnswer = normalize(answer.selected);
                    const correctAnswer = normalize(question.correct);

                    // Only compare if both are non-empty
                    if (userAnswer && correctAnswer) {
                        isCorrect = userAnswer === correctAnswer;
                    } else if (!userAnswer && !correctAnswer) {
                        // Both empty - consider correct
                        isCorrect = true;
                    } else {
                        // One is empty, one is not - incorrect
                        isCorrect = false;
                    }

                    // Debug log
                    console.log(`Short answer comparison - Index: ${index}, User: "${userAnswer}" (raw: "${answer.selected}"), Correct: "${correctAnswer}" (raw: "${question.correct}"), Match: ${isCorrect}`);
                } else {
                    // For multiple choice: exact match
                    isCorrect = answer.selected === question.correct;
                }
            }

            if (isCorrect) correctCount++;

            return {
                questionId: question?.id || index,
                selected: answer.selected,
                correct: question?.correct || '',
                isCorrect
            };
        });

        const score = (correctCount / quiz.questions.length) * 100;

        // Save attempt
        const attempt = await quizService.createQuizAttempt(userId, quizId, formattedAnswers, score);

        return res.status(200).json(
            JSend.success({
                attempt,
                score: Math.round(score * 100) / 100,
                correctCount,
                totalQuestions: quiz.questions.length,
                formattedAnswers // Include formatted answers with isCorrect flags
            })
        );
    } catch (error) {
        console.error('Error submitting quiz attempt:', error);
        return next(
            new ApiError(500, error.message || "Failed to submit quiz attempt")
        );
    }
}

/**
 * GET /api/v1/quiz/attempts
 * Get user's quiz attempts
 */
async function getUserAttempts(req, res, next) {
    try {
        const userId = req.query.userId || req.user?.id;
        const quizId = req.query.quizId || null;

        if (!userId) {
            return next(new ApiError(400, "userId is required"));
        }

        const attempts = await quizService.getUserAttempts(userId, quizId);

        return res.status(200).json(
            JSend.success({ attempts })
        );
    } catch (error) {
        console.error('Error getting user attempts:', error);
        return next(
            new ApiError(500, error.message || "Failed to get quiz attempts")
        );
    }
}

/**
 * GET /api/v1/quiz?userId=xxx
 * Get all quizzes for a user
 */
async function getUserQuizzes(req, res, next) {
    try {
        const userId = req.query.userId || req.user?.id;

        if (!userId) {
            return next(new ApiError(400, "userId is required"));
        }

        const quizzes = await quizService.getUserQuizzes(userId);

        return res.status(200).json(
            JSend.success({ quizzes })
        );
    } catch (error) {
        console.error('Error getting user quizzes:', error);
        return next(
            new ApiError(500, error.message || "Failed to get user quizzes")
        );
    }
}

/**
 * DELETE /api/v1/quiz/:id
 * Delete quiz (soft delete - set status to 0)
 */
async function deleteQuiz(req, res, next) {
    try {
        const quizId = req.params.id;
        const userId = req.body.userId || req.query.userId || req.user?.id;

        if (!userId) {
            return next(new ApiError(400, "userId is required"));
        }

        await quizService.deleteQuiz(quizId, userId);

        return res.status(200).json(
            JSend.success({ message: "Quiz deleted successfully" })
        );
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return next(
            new ApiError(500, error.message || "Failed to delete quiz")
        );
    }
}

/**
 * GET /api/v1/quiz/:id/detail
 * Get quiz detail with statistics
 */
async function getQuizDetail(req, res, next) {
    try {
        const quizId = req.params.id;
        const userId = req.query.userId || req.user?.id;

        if (!userId) {
            return next(new ApiError(400, "userId is required"));
        }

        const result = await quizService.getQuizDetail(quizId, userId);

        return res.status(200).json(
            JSend.success(result)
        );
    } catch (error) {
        console.error('Error getting quiz detail:', error);
        return next(
            new ApiError(500, error.message || "Failed to get quiz detail")
        );
    }
}

module.exports = {
    getQuiz,
    getQuizQuestions,
    saveQuiz,
    updateQuiz,
    submitQuizAttempt,
    getUserAttempts,
    getUserQuizzes,
    deleteQuiz,
    getQuizDetail,
};
