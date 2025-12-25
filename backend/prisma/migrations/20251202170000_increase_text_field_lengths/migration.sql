-- AlterTable
ALTER TABLE `Question` MODIFY `content` TEXT NOT NULL,
    MODIFY `correct` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Answer` MODIFY `option` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Quiz` MODIFY `title` VARCHAR(500) NOT NULL;

