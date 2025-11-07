-- AlterTable
ALTER TABLE "RecipeVersion" ADD COLUMN "tasteRating" INTEGER,
ADD COLUMN "visualRating" INTEGER,
ADD COLUMN "textureRating" INTEGER,
ADD COLUMN "tasteTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "textureTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
