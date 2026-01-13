/*
  Warnings:

  - You are about to drop the `global_constants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `worlds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "global_constants";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "worlds";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "m_worlds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "m_global_constants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "m_entities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "world_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "m_entities_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "m_worlds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "m_entity_personas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "m_entity_personas_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_entity_personas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_entity_personas_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "h_entity_personas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "h_entity_personas_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "m_entity_parameters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "m_entity_parameters_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_entity_parameters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_entity_parameters_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "h_entity_parameters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "h_entity_parameters_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "m_entity_states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "m_entity_states_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_entity_states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_entity_states_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "h_entity_states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "h_entity_states_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_chats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "world_id" TEXT NOT NULL,
    "chat_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity_id" TEXT,
    CONSTRAINT "t_chats_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "m_worlds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "t_chats_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_api_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_type" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "status_code" INTEGER,
    "error_message" TEXT,
    "execution_time_ms" INTEGER,
    "world_id" TEXT,
    "entity_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "t_api_logs_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "m_worlds" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "t_api_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "m_entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_user_profile_lists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_user_profiles" (
    "list_id" INTEGER NOT NULL,
    "key_name" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,

    PRIMARY KEY ("list_id", "key_name"),
    CONSTRAINT "t_user_profiles_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "t_user_profile_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_user_settings" (
    "key_name" TEXT NOT NULL PRIMARY KEY,
    "key_value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "m_global_constants_key_name_key" ON "m_global_constants"("key_name");

-- CreateIndex
CREATE UNIQUE INDEX "m_entity_personas_entity_id_key" ON "m_entity_personas"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_entity_personas_entity_id_key" ON "t_entity_personas"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_entity_parameters_entity_id_key" ON "m_entity_parameters"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_entity_parameters_entity_id_key" ON "t_entity_parameters"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_entity_states_entity_id_key" ON "m_entity_states"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_entity_states_entity_id_key" ON "t_entity_states"("entity_id");

-- CreateIndex
CREATE INDEX "t_api_logs_api_type_created_at_idx" ON "t_api_logs"("api_type", "created_at");

-- CreateIndex
CREATE INDEX "t_api_logs_world_id_created_at_idx" ON "t_api_logs"("world_id", "created_at");

-- CreateIndex
CREATE INDEX "t_api_logs_entity_id_created_at_idx" ON "t_api_logs"("entity_id", "created_at");

-- CreateIndex
CREATE INDEX "t_api_logs_status_code_idx" ON "t_api_logs"("status_code");
