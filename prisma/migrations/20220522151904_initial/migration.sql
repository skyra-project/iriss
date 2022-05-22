-- CreateTable
CREATE TABLE "Guild" (
    "id"                   BIGINT  NOT NULL,
    "channel"              BIGINT,
    "autoThread"           BOOLEAN NOT NULL DEFAULT false,
    "buttons"              BOOLEAN NOT NULL DEFAULT true,
    "compact"              BOOLEAN NOT NULL DEFAULT false,
    "displayUpdateHistory" BOOLEAN NOT NULL DEFAULT false,
    "embed"                BOOLEAN NOT NULL DEFAULT true,
    "reactions"            TEXT[],
    "removeReactions"      BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id"         INTEGER      NOT NULL,
    "guildId"    BIGINT       NOT NULL,
    "authorId"   BIGINT       NOT NULL,
    "messageId"  BIGINT       NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt"  TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id","guildId")
);

-- AddForeignKey
ALTER TABLE "Suggestion"
	ADD CONSTRAINT "Suggestion_guildId_fkey"
	FOREIGN KEY ("guildId")
	REFERENCES "Guild"("id")
	ON DELETE RESTRICT
	ON UPDATE CASCADE;
