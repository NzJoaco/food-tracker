import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Validación de datos que se pueden actualizar
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

// GET - obtener datos del usuario autenticado
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true, // opcional
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// PUT - actualizar datos del usuario autenticado
router.put("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Datos inválidos", details: error.issues });
    }
    console.error("Error al actualizar usuario:", error);
    return res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE - eliminar usuario autenticado
router.delete("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.userId },
    });

    return res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
