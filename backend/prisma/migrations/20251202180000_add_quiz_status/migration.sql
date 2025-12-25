-- Safeguard: only add the column if it does not exist (MySQL 8+)
ALTER TABLE `Quiz` ADD COLUMN IF NOT EXISTS `status` INTEGER NOT NULL DEFAULT 1;
