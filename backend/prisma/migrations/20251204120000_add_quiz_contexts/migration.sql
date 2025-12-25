-- CreateQuizContext table to store normalized/cleaned chunks
CREATE TABLE IF NOT EXISTS `QuizContext` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` LONGTEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `quizId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
)
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key to Quiz
ALTER TABLE `QuizContext` ADD CONSTRAINT `QuizContext_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
