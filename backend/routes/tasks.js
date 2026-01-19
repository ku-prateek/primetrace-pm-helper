const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/tasks - List all tasks
router.get("/", async (req, res) => {
    try {
        const { status, owner_id, created_by } = req.query;

        let query = `SELECT t.*, 
                            u1.username as owner_username, u1.role as owner_role,
                            u2.username as creator_username
                     FROM tasks t
                     JOIN users u1 ON t.owner_id = u1.id
                     JOIN users u2 ON t.created_by = u2.id
                     WHERE 1=1`;

        const params = [];

        if (status) {
            query += " AND t.status = ?";
            params.push(status);
        }

        if (owner_id) {
            query += " AND t.owner_id = ?";
            params.push(owner_id);
        }

        if (created_by) {
            query += " AND t.created_by = ?";
            params.push(created_by);
        }

        query += " ORDER BY t.created_at DESC";

        const [tasks] = await db.query(query, params);
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// GET /api/tasks/:id/history - Get task event history (must be before /:id)
router.get("/:id/history", async (req, res) => {
    try {
        const { id } = req.params;

        // Verify task exists
        const [tasks] = await db.query("SELECT id FROM tasks WHERE id = ?", [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        const [events] = await db.query(
            `SELECT te.*, u.username as changed_by_username
             FROM task_events te
             JOIN users u ON te.changed_by = u.id
             WHERE te.task_id = ?
             ORDER BY te.created_at DESC`,
            [id]
        );

        res.json(events);
    } catch (error) {
        console.error("Error fetching task history:", error);
        res.status(500).json({ error: "Failed to fetch task history" });
    }
});

// GET /api/tasks/:id - Get single task
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [tasks] = await db.query(
            `SELECT t.*, 
                    u1.username as owner_username, u1.role as owner_role,
                    u2.username as creator_username
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             JOIN users u2 ON t.created_by = u2.id
             WHERE t.id = ?`,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.json(tasks[0]);
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ error: "Failed to fetch task" });
    }
});

// POST /api/tasks - Create task (PM only)
router.post("/", async (req, res) => {
    try {
        const { title, created_by, owner_id, due_date, notes } = req.body;

        // Validate required fields
        if (!title || !created_by || !owner_id) {
            return res.status(400).json({
                error: "Missing required fields: title, created_by, owner_id",
            });
        }

        // Verify created_by is a PM
        const [creators] = await db.query(
            "SELECT role FROM users WHERE id = ?",
            [created_by]
        );

        if (creators.length === 0) {
            return res.status(404).json({ error: "Creator user not found" });
        }

        if (creators[0].role !== "PM") {
            return res.status(403).json({
                error: "Only PM users can create tasks",
            });
        }

        // Verify owner exists
        const [owners] = await db.query("SELECT id FROM users WHERE id = ?", [
            owner_id,
        ]);

        if (owners.length === 0) {
            return res.status(404).json({ error: "Owner user not found" });
        }

        // Create task
        const [result] = await db.query(
            `INSERT INTO tasks (title, owner_id, status, due_date, notes, created_by)
             VALUES (?, ?, 'created', ?, ?, ?)`,
            [title, owner_id, due_date || null, notes || null, created_by]
        );

        const taskId = result.insertId;

        // Log creation event
        await db.query(
            `INSERT INTO task_events (task_id, event_type, new_value, changed_by)
             VALUES (?, 'created', ?, ?)`,
            [taskId, `Task created: ${title}`, created_by]
        );

        // Fetch and return created task
        const [tasks] = await db.query(
            `SELECT t.*, 
                    u1.username as owner_username, u1.role as owner_role,
                    u2.username as creator_username
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             JOIN users u2 ON t.created_by = u2.id
             WHERE t.id = ?`,
            [taskId]
        );

        res.status(201).json(tasks[0]);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});

// PUT /api/tasks/:id/assign - Assign task (PM → Dev → QA)
router.put("/:id/assign", async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_by, new_owner_id } = req.body;

        // Validate required fields
        if (!assigned_by || !new_owner_id) {
            return res.status(400).json({
                error: "Missing required fields: assigned_by, new_owner_id",
            });
        }

        // Get current task
        const [tasks] = await db.query(
            `SELECT t.*, u1.role as current_owner_role
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             WHERE t.id = ?`,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        const task = tasks[0];
        const currentStatus = task.status;
        const currentOwnerId = task.owner_id;

        // Verify assigned_by user exists and get role
        const [assigners] = await db.query(
            "SELECT id, role FROM users WHERE id = ?",
            [assigned_by]
        );

        if (assigners.length === 0) {
            return res.status(404).json({ error: "Assigner user not found" });
        }

        const assignerRole = assigners[0].role;

        // Verify new owner exists and get role
        const [newOwners] = await db.query(
            "SELECT id, role FROM users WHERE id = ?",
            [new_owner_id]
        );

        if (newOwners.length === 0) {
            return res.status(404).json({ error: "New owner user not found" });
        }

        const newOwnerRole = newOwners[0].role;

        // Validate transition rules
        let newStatus;
        let eventType;

        if (currentStatus === "created" && assignerRole === "PM" && newOwnerRole === "Dev") {
            // PM assigns to Dev (PM can assign even if not current owner, if status is 'created')
            newStatus = "assigned_to_dev";
            eventType = "assigned_to_dev";
        } else if (
            currentStatus === "assigned_to_dev" &&
            assignerRole === "Dev" &&
            newOwnerRole === "QA"
        ) {
            // Dev assigns to QA
            newStatus = "assigned_to_qa";
            eventType = "assigned_to_qa";
        } else {
            return res.status(400).json({
                error: `Invalid transition: Cannot assign from status '${currentStatus}' by ${assignerRole} to ${newOwnerRole}`,
            });
        }

        // Verify assigner is current owner (except PM assigning from 'created' status)
        if (
            currentStatus !== "created" &&
            parseInt(assigned_by) !== parseInt(currentOwnerId)
        ) {
            return res.status(403).json({
                error: "Only the current task owner can assign the task",
            });
        }

        // Update task
        await db.query(
            "UPDATE tasks SET owner_id = ?, status = ? WHERE id = ?",
            [new_owner_id, newStatus, id]
        );

        // Log assignment event
        await db.query(
            `INSERT INTO task_events (task_id, event_type, old_value, new_value, changed_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                eventType,
                `Owner: ${task.owner_id}, Status: ${currentStatus}`,
                `Owner: ${new_owner_id}, Status: ${newStatus}`,
                assigned_by,
            ]
        );

        // Fetch and return updated task
        const [updatedTasks] = await db.query(
            `SELECT t.*, 
                    u1.username as owner_username, u1.role as owner_role,
                    u2.username as creator_username
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             JOIN users u2 ON t.created_by = u2.id
             WHERE t.id = ?`,
            [id]
        );

        res.json(updatedTasks[0]);
    } catch (error) {
        console.error("Error assigning task:", error);
        res.status(500).json({ error: "Failed to assign task" });
    }
});

// PUT /api/tasks/:id - Update task
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { updated_by, status, notes, due_date } = req.body;

        if (!updated_by) {
            return res.status(400).json({
                error: "Missing required field: updated_by",
            });
        }

        // Get current task
        const [tasks] = await db.query(
            `SELECT t.*, u1.role as owner_role
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             WHERE t.id = ?`,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        const task = tasks[0];

        // Verify updated_by user exists
        const [updaters] = await db.query(
            "SELECT id, role FROM users WHERE id = ?",
            [updated_by]
        );

        if (updaters.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify user is owner or creator
        if (
            parseInt(updated_by) !== parseInt(task.owner_id) &&
            parseInt(updated_by) !== parseInt(task.created_by)
        ) {
            return res.status(403).json({
                error: "Only task owner or creator can update the task",
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        const events = [];

        if (status !== undefined && status !== task.status) {
            // Validate status transition (allow direct status updates by owner/creator)
            const validStatuses = ["created", "assigned_to_dev", "assigned_to_qa", "completed"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: `Invalid status: ${status}`,
                });
            }
            updates.push("status = ?");
            values.push(status);
            events.push({
                type: "status_changed",
                old_value: task.status,
                new_value: status,
            });
        }

        if (notes !== undefined && notes !== task.notes) {
            updates.push("notes = ?");
            values.push(notes);
            events.push({
                type: "notes_updated",
                old_value: task.notes || "",
                new_value: notes || "",
            });
        }

        if (due_date !== undefined) {
            const currentDueDate = task.due_date
                ? new Date(task.due_date).toISOString().split("T")[0]
                : null;
            const newDueDate = due_date ? new Date(due_date).toISOString().split("T")[0] : null;

            if (currentDueDate !== newDueDate) {
                updates.push("due_date = ?");
                values.push(due_date || null);
                events.push({
                    type: "due_date_updated",
                    old_value: currentDueDate || "",
                    new_value: newDueDate || "",
                });
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: "No fields to update",
            });
        }

        // Update task
        values.push(id);
        await db.query(
            `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        // Log events
        for (const event of events) {
            await db.query(
                `INSERT INTO task_events (task_id, event_type, old_value, new_value, changed_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, event.type, event.old_value, event.new_value, updated_by]
            );
        }

        // Fetch and return updated task
        const [updatedTasks] = await db.query(
            `SELECT t.*, 
                    u1.username as owner_username, u1.role as owner_role,
                    u2.username as creator_username
             FROM tasks t
             JOIN users u1 ON t.owner_id = u1.id
             JOIN users u2 ON t.created_by = u2.id
             WHERE t.id = ?`,
            [id]
        );

        res.json(updatedTasks[0]);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
    }
});


module.exports = router;
