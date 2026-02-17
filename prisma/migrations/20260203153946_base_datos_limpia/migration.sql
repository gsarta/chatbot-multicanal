-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "whatsapp_id" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT,
    "empresa" TEXT,
    "pais" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" SERIAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta_oficial" TEXT NOT NULL,
    "fuente_url" TEXT,
    "tags" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mensaje_usuario" TEXT NOT NULL,
    "respuesta_bot" TEXT NOT NULL,
    "intencion" TEXT,
    "resolucion_automatica" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "producto" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "kb_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsapp_id_key" ON "User"("whatsapp_id");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_kb_id_fkey" FOREIGN KEY ("kb_id") REFERENCES "KnowledgeBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
