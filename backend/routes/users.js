const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/users - List all users
router.get("/", async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT id, username, role, created_at FROM users ORDER BY id"
        );
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// GET /api/users/:id - Get single user
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.query(
            "SELECT id, username, role, created_at FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(users[0]);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

module.exports = router;
