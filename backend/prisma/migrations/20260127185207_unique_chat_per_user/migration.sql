/*
  Warnings:

  - A unique constraint covering the columns `[user_id,chat_name]` on the table `chat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chat_user_id_chat_name_key" ON "chat"("user_id", "chat_name");
