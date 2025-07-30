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

    res.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.issues });
    }
    console.error("Error al crear/actualizar goal:", error);
    res.status(500).json({ error: "Error al guardar objetivos" });
  }
});

export default router;
