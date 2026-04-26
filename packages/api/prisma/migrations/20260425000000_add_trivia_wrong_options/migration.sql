-- AlterTable
ALTER TABLE "Trivia" ADD COLUMN "wrong_options" TEXT[] NOT NULL DEFAULT '{}';
