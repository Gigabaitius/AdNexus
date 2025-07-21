// userRoutes.js
// Routes - определяют, какой контроллер обрабатывает какой URL

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/users", authMiddleware, requireAdmin, userController.getUsers);
router.put("/users/:id", authMiddleware, requireAdmin, userController.updateUser);
router.delete("/users/:id", authMiddleware, requireAdmin, userController.deleteUser);

module.exports = router;