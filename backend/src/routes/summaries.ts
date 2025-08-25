import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /summaries - resumen diario de macros de todas las comidas
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Obtener todas las comidas del usuario con sus entradas
    const meals = await prisma.meal.findMany({
      where: { userId: req.userId },
      include: { entries: true },
      orderBy: { date: "desc" },
    });

    // Mapear cada comida a sus macros totales
    const summary = meals.map((meal) => {
      const macros = meal.entries.reduce(
        (acc, entry) => {
          acc.calories += entry.calories * entry.quantity;
          acc.protein += entry.protein * entry.quantity;
          acc.carbs += entry.carbs * entry.quantity;
          acc.fat += entry.fat * entry.quantity;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        mealId: meal.id,
        date: meal.date.toISOString().split("T")[0],
        ...macros,
      };
    });

    return res.json(summary);
  } catch (error) {
    console.error("Error al obtener resumen de macros:", error);
    return res.status(500).json({ error: "Error al obtener resumen de macros" });
  }
});

// GET /summaries/:date - resumen de macros de un día específico
router.get("/:date", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const dateParam = req.params.date; // Espera formato YYYY-MM-DD
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    // Limites para el día
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const meals = await prisma.meal.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: { entries: true },
    });

    const summary = meals.map((meal) => {
      const macros = meal.entries.reduce(
        (acc, entry) => {
          acc.calories += entry.calories * entry.quantity;
          acc.protein += entry.protein * entry.quantity;
          acc.carbs += entry.carbs * entry.quantity;
          acc.fat += entry.fat * entry.quantity;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        mealId: meal.id,
        date: meal.date.toISOString().split("T")[0],
        ...macros,
      };
    });

    return res.json(summary);
  } catch (error) {
    console.error("Error al obtener resumen diario:", error);
    return res.status(500).json({ error: "Error al obtener resumen diario" });
  }
});

export default router;
