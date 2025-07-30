import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Espera formato: "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });

    // @ts-ignore
    req.userId = user.userId;
    next();
  });
};
