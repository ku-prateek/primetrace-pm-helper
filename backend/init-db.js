require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");

async function initDatabase() {
    let connection;

    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true,
        });

        console.log("Connected to MySQL");

        // Read and execute schema
        const schemaPath = path.join(__dirname, "schema.sql");
        let schema = await fs.readFile(schemaPath, "utf8");

        // Remove comment lines
        schema = schema
            .split("\n")
            .filter(line => !line.trim().startsWith("--") && line.trim().length > 0)
            .join("\n");

        // Execute all statements at once
        await connection.query(schema);

        console.log("Schema created successfully");

        // Seed initial users (PM, Dev, QA)
        const seedUsers = [
            { username: "pm_user", role: "PM" },
            { username: "dev_user", role: "Dev" },
            { username: "qa_user", role: "QA" },
        ];

        for (const user of seedUsers) {
            await connection.query(
                "INSERT IGNORE INTO users (username, role) VALUES (?, ?)",
                [user.username, user.role]
            );
        }

        console.log("Initial users seeded");

        console.log("\n✅ Database initialization complete!");

    } catch (error) {
        console.error("Initialization error:", error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();
