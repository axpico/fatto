-- CreateTable
CREATE TABLE "SwipeReject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeReject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwipeReject_recipeId_idx" ON "SwipeReject"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "SwipeReject_userId_recipeId_key" ON "SwipeReject"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "SwipeReject" ADD CONSTRAINT "SwipeReject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeReject" ADD CONSTRAINT "SwipeReject_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
