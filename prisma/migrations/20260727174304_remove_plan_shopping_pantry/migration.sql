/*
  Warnings:

  - You are about to drop the `MealPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PantryItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShoppingListItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_userId_fkey";

-- DropTable
DROP TABLE "MealPlan";

-- DropTable
DROP TABLE "PantryItem";

-- DropTable
DROP TABLE "ShoppingListItem";

-- DropEnum
DROP TYPE "MealSlot";

-- DropEnum
DROP TYPE "ShoppingListSource";
