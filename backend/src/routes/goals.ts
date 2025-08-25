import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const goalSchema = z.object({
  calories: z.number().int().positive(),
  protein: z.number().int().positive(),
  carbs: z.number().int().positive(),
  fat: z.number().int().positive(),
});

// GET - obtener objetivo del usuario
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { userId: req.userId },
    });

    if (!goal) {
      return res.status(404).json({ error: "No tienes objetivos configurados" });
    }

    return res.json(goal);
  } catch (error) {
    console.error("Error al obtener objetivos:", error);
    return res.status(500).json({ error: "Error al obtener objetivos" });
  }
});

// POST - crear o actualizar objetivo
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = goalSchema.parse(req.body);

    const existingGoal = await prisma.goal.findFirst({
      where: { userId: req.userId },
    });

    let goal;
    if (existingGoal) {
      goal = await prisma.goal.update({
        where: { id: existingGoal.id },
        data,
      });
    } else {
      goal = await prisma.goal.create({
        data: {
          ...data,
          userId: req.userId!,
        },
      });
    }

    return res.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Datos inválidos", details: error.issues });
    }
    console.error("Error al crear/actualizar objetivos:", error);
    return res.status(500).json({ error: "Error al guardar objetivos" });
  }
});

// PUT - actualizar objetivo existente
router.put("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = goalSchema.partial().parse(req.body);

    const existingGoal = await prisma.goal.findFirst({
      where: { userId: req.userId },
    });

    if (!existingGoal) {
      return res.status(404).json({ error: "No tienes objetivos configurados" });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: existingGoal.id },
      data,
    });

    return res.json(updatedGoal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Datos inválidos", details: error.issues });
    }
    console.error("Error al actualizar objetivos:", error);
    return res.status(500).json({ error: "Error al actualizar objetivos" });
  }
});

// DELETE - eliminar objetivo
router.delete("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const existingGoal = await prisma.goal.findFirst({
      where: { userId: req.userId },
    });

    if (!existingGoal) {
      return res.status(404).json({ error: "No tienes objetivos configurados" });
    }

    await prisma.goal.delete({
      where: { id: existingGoal.id },
    });

    return res.json({ message: "Objetivos eliminados correctamente" });
  } catch (error) {
    console.error("Error al eliminar objetivos:", error);
    return res.status(500).json({ error: "Error al eliminar objetivos" });
  }
});

export default router;
