import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Esquema para crear una comida
const mealSchema = z.object({
  date: z.string().datetime(),
});

// Esquema para validar una entrada de comida
const mealEntrySchema = z.object({
  foodName: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

// Ruta para crear una comida (POST /meals)
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const newMeal = await prisma.meal.create({
      data: {
        date: new Date(parsed.data.date),
        userId: req.userId,
      },
    });

    return res.status(201).json(newMeal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear la comida" });
  }
});

// Ruta para agregar una entrada a una comida (POST /meals/:mealId/entries)
router.post("/:mealId/entries", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = mealEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const mealId = Number(req.params.mealId);
    if (isNaN(mealId)) {
      return res.status(400).json({ error: "mealId inválido" });
    }

    // Verificar que la comida existe y pertenece al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== req.userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Crear la entrada
    const entry = await prisma.mealEntry.create({
      data: {
        mealId,
        foodName: parsed.data.foodName,
        calories: parsed.data.calories,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        quantity: parsed.data.quantity,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear la entrada" });
  }
});

export default router;
