-- CreateTable
CREATE TABLE "global_constants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "global_constants_key_name_key" ON "global_constants"("key_name");
