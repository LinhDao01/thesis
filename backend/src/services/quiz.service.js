const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Backwards compatibility: older Prisma clients may not have the citation field yet
const QUESTION_HAS_CITATION = (() => {
    try {
        const fields = prisma?._dmmf?.modelMap?.Question?.fields || []
        return fields.some(f => f.name === 'citation')
    } catch (e) {
        return false
    }
})()

module.exports = {
    /**
     * Get quiz with questions and answers
     */
    async getQuizById(quizId) {
        try {
            return await prisma.quiz.findFirst({
                where: {
                    id: Number(quizId),
                    status: 1 // Only get active quizzes
                },
                include: {
                    questions: {
                        include: {
                            answers: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            })
        } catch (error) {
            // Fallback if status field is not recognized
            if (error.message && error.message.includes('status')) {
                return await prisma.quiz.findFirst({
                    where: {
                        id: Number(quizId)
                    },
                    include: {
                        questions: {
                            include: {
                                answers: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                })
            }
            throw error
        }
    },

    /**
     * Get formatted quiz questions for frontend
     */
    async getQuizQuestions(quizId) {
        const quiz = await this.getQuizById(quizId)
        if (!quiz) {
            throw new Error('Quiz not found')
        }

        return quiz.questions.map(q => {
            // For short answer questions, answers array will be empty
            const options = q.answers.length > 0 ? q.answers.map(a => a.option) : [];
            const correctIndex = options.length > 0 ? q.answers.findIndex(a => a.option === q.correct) : -1;

            return {
                id: q.id,
                question: q.content,
                options: options,
                correct: q.correct || '', // Ensure correct is never null
                correctIndex: correctIndex,
                citation: q.citation || null
            };
        })
    },

    /**
     * Save quiz to database
     */
    async saveQuiz(userId, title, questions) {
        return await prisma.quiz.create({
            data: {
                title,
                userId,
                status: 1, // Set as active by default
                questions: {
                    create: questions.map(q => ({
                        content: q.question,
                        correct: q.answer,
                        ...(QUESTION_HAS_CITATION ? { citation: q.citation || null } : {}),
                        answers: {
                            create: q.choices.map((choice, idx) => ({
                                option: choice,
                                isCorrect: choice === q.answer
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: {
                        answers: true
                    }
                }
            }
        })
    },

    /**
     * Update quiz (delete old questions and create new ones)
     */
    async updateQuiz(quizId, userId, title, questions) {
        // First verify ownership
        const existingQuiz = await prisma.quiz.findUnique({
            where: { id: parseInt(quizId) }
        })

        if (!existingQuiz) {
            throw new Error('Quiz not found')
        }

        if (existingQuiz.userId !== parseInt(userId)) {
            throw new Error('Unauthorized to update this quiz')
        }

        // Get all questions for this quiz first
        const existingQuestions = await prisma.question.findMany({
            where: { quizId: parseInt(quizId) },
            select: { id: true }
        })

        const questionIds = existingQuestions.map(q => q.id)

        // Delete all answers first (they have foreign key to questions)
        if (questionIds.length > 0) {
            await prisma.answer.deleteMany({
                where: { questionId: { in: questionIds } }
            })
        }

        // Then delete all questions
        await prisma.question.deleteMany({
            where: { quizId: parseInt(quizId) }
        })

        // Update quiz title and create new questions
        return await prisma.quiz.update({
            where: { id: parseInt(quizId) },
            data: {
                title,
                questions: {
                    create: questions.map(q => ({
                        content: q.question,
                        correct: q.answer,
                        ...(QUESTION_HAS_CITATION ? { citation: q.citation || null } : {}),
                        answers: {
                            create: q.choices.map((choice, idx) => ({
                                option: choice,
                                isCorrect: choice === q.answer
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: {
                        answers: true
                    }
                }
            }
        })
    },

    /**
     * Create quiz attempt
     */
    async createQuizAttempt(userId, quizId, answers, score) {
        return await prisma.quizAttempt.create({
            data: {
                userId: Number(userId),
                quizId: Number(quizId),
                answers: answers,
                score: Number(score)
            }
        })
    },

    /**
     * Get user's quiz attempts
     */
    async getUserAttempts(userId, quizId = null) {
        const where = { userId: Number(userId) }
        if (quizId) {
            where.quizId = Number(quizId)
        }

        return await prisma.quizAttempt.findMany({
            where,
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    },

    /**
     * Get quiz detail with statistics
     */
    async getQuizDetail(quizId, userId) {
        // Get quiz info
        const quiz = await this.getQuizById(quizId)
        if (!quiz) {
            throw new Error('Quiz not found')
        }

        // Get all attempts for this quiz by this user
        const attempts = await prisma.quizAttempt.findMany({
            where: {
                quizId: Number(quizId),
                userId: Number(userId)
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Calculate statistics
        const totalAttempts = attempts.length
        const scores = attempts.map(a => Number(a.score))
        const averageScore = scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : 0
        const topScore = scores.length > 0 ? Math.max(...scores) : 0

        return {
            quiz,
            attempts,
            statistics: {
                totalAttempts,
                averageScore,
                topScore,
                timeLimit: null // TODO: Add time limit field to Quiz model if needed
            }
        }
    },

    /**
     * Get all quizzes for a user (only active quizzes)
     */
    async getUserQuizzes(userId) {
        // Use raw query temporarily if status field is not recognized by Prisma Client
        // This will work even if Prisma Client hasn't been regenerated
        try {
            return await prisma.quiz.findMany({
                where: {
                    userId: Number(userId),
                    status: 1 // Only get active quizzes
                },
                include: {
                    _count: {
                        select: {
                            questions: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
        } catch (error) {
            // Fallback to raw query if status field is not recognized
            if (error.message && error.message.includes('status')) {
                const quizzes = await prisma.$queryRaw`
                    SELECT q.*, 
                           (SELECT COUNT(*) FROM Question WHERE quizId = q.id) as questionCount
                    FROM Quiz q
                    WHERE q.userId = ${Number(userId)} 
                    AND (q.status = 1 OR q.status IS NULL)
                    ORDER BY q.createdAt DESC
                `
                // Transform raw result to match expected format
                return quizzes.map(quiz => ({
                    id: quiz.id,
                    title: quiz.title,
                    userId: quiz.userId,
                    status: quiz.status || 1,
                    createdAt: quiz.createdAt,
                    _count: {
                        questions: Number(quiz.questionCount) || 0
                    }
                }))
            }
            throw error
        }
    },

    /**
     * Delete quiz (soft delete - set status to 0)
     */
    async deleteQuiz(quizId, userId) {
        // Verify quiz belongs to user
        const quiz = await prisma.quiz.findFirst({
            where: {
                id: Number(quizId),
                userId: Number(userId)
            }
        })

        if (!quiz) {
            throw new Error('Quiz not found or you do not have permission to delete it')
        }

        // Soft delete - set status to 0
        try {
            return await prisma.quiz.update({
                where: { id: Number(quizId) },
                data: { status: 0 }
            })
        } catch (error) {
            // Fallback to raw query if status field is not recognized
            if (error.message && error.message.includes('status')) {
                await prisma.$executeRaw`
                    UPDATE Quiz 
                    SET status = 0 
                    WHERE id = ${Number(quizId)}
                `
                return { id: Number(quizId), status: 0 }
            }
            throw error
        }
    }
}
