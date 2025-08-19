// *project*/backend/routes/userRoutes.js
// Routes - определяют, какой контроллер обрабатывает какой URL

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Только для администраторов
router.get("/users", authMiddleware, requireAdmin, userController.getUsers);
router.get("/users/:id", authMiddleware, requireAdmin, userController.getUserById);
router.put("/users/:id", authMiddleware, requireAdmin, userController.updateUser);
router.delete("/users/:id", authMiddleware, requireAdmin, userController.deleteUser);
router.post("/users/:id/grant-admin", authMiddleware, requireAdmin, userController.grantAdminRights);
router.post("/users/:id/grant-moderator", authMiddleware, requireAdmin, userController.grantModeratorRights);

module.exports = router;
