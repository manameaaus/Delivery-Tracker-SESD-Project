import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { DeliveryController } from "../controllers/DeliveryController.js";
import { UserController } from "../controllers/UserController.js";
import { AuthService } from "../../application/services/AuthService.js";
import { DeliveryService } from "../../application/services/DeliveryService.js";
import { UserService } from "../../application/services/UserService.js";
import { SupabaseAuthRepository } from "../../infrastructure/repositories/SupabaseAuthRepository.js";
import { SupabaseDeliveryRepository } from "../../infrastructure/repositories/SupabaseDeliveryRepository.js";
import { SupabaseUserRepository } from "../../infrastructure/repositories/SupabaseUserRepository.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";


export function createRouter() {
  const router = Router();
  
  const authController = new AuthController(new AuthService(new SupabaseAuthRepository()));
  const deliveryController = new DeliveryController(new DeliveryService(new SupabaseDeliveryRepository()));
  const userController = new UserController(new UserService(new SupabaseUserRepository()));

  router.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  router.post("/auth/sign-in", authController.signIn);
  router.get("/auth/me", authMiddleware, authController.me);

  router.get("/deliveries", authMiddleware, deliveryController.list);
  router.get("/deliveries/dashboard", authMiddleware, deliveryController.dashboard);
  router.get("/deliveries/export", authMiddleware, deliveryController.export);
  router.post("/deliveries", authMiddleware, deliveryController.create);
  router.put("/deliveries/:id", authMiddleware, deliveryController.update);
  router.patch("/deliveries/:id/claim", authMiddleware, deliveryController.claim);
  router.patch("/deliveries/:id/start", authMiddleware, deliveryController.start);
  router.patch("/deliveries/:id/deliver", authMiddleware, deliveryController.markDelivered);
  router.patch("/deliveries/:id/approve", authMiddleware, deliveryController.approve);
  router.patch("/deliveries/:id/reject", authMiddleware, deliveryController.reject);

  router.get("/users", authMiddleware, userController.listUsers);
  router.get("/users/runners", authMiddleware, userController.listRunners);
  router.delete("/users/:id", authMiddleware, userController.deleteUser);

  return router;
}

