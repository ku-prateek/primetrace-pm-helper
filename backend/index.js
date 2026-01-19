require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error("DB connection failed:", err.message);
        process.exit(1);
    } else {
        console.log("MySQL connected");
    }
});

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Routes
const taskRoutes = require("./routes/tasks");
const userRoutes = require("./routes/users");

app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Task Management API",
        endpoints: {
            users: "/api/users",
            tasks: "/api/tasks",
            health: "/health",
        },
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", database: "connected" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
