import { Router, Request, Response } from "express";
import { Todo, ITodo } from "../models/Todo";

const router = Router();

// GET /api/todos — list all non-deleted todos
router.get("/", async (_req: Request, res: Response) => {
  try {
    const todos = await Todo.find({ deletedAt: null }).lean();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// POST /api/todos — create a todo
router.post("/", async (req: Request, res: Response) => {
  try {
    const { id, text, completed } = req.body;

    if (!id || !text) {
      res.status(400).json({ error: "id and text are required" });
      return;
    }

    const todo = new Todo({
      id,
      text,
      completed: completed ?? false,
      version: 1,
    });

    await todo.save();
    res.status(201).json(todo.toJSON());
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ error: "A todo with this id already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// PUT /api/todos/:id — update a todo (text, completed)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;

    const todo = await Todo.findOne({ id, deletedAt: null });
    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    if (text !== undefined) {
      todo.text = text;
    }
    if (completed !== undefined) {
      todo.completed = completed;
    }
    todo.version += 1;

    await todo.save();
    res.json(todo.toJSON());
  } catch (err) {
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /api/todos/:id — soft delete
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOne({ id, deletedAt: null });
    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    todo.deletedAt = new Date();
    todo.version += 1;

    await todo.save();
    res.json(todo.toJSON());
  } catch (err) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

// Update lastSyncTimestamp whenever a sync happens
let lastSyncTimestamp: string | null = null;

router.use("/sync", (_req: Request, _res: Response, next: () => void) => {
  lastSyncTimestamp = new Date().toISOString();
  next();
});

// POST /api/todos/sync — batch sync with conflict detection
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { todos } = req.body as {
      todos: Array<{
        id: string;
        text: string;
        completed: boolean;
        version: number;
        deletedAt: string | null;
        updatedAt: string;
      }>;
    };

    if (!Array.isArray(todos)) {
      res.status(400).json({ error: "todos array is required" });
      return;
    }

    const synced: ITodo[] = [];
    const conflicts: Array<{ server: ITodo; client: ITodo }> = [];

    for (const incoming of todos) {
      const serverTodo = await Todo.findOne({ id: incoming.id });

      if (!serverTodo) {
        // New todo from client — create it
        const newTodo = new Todo({
          id: incoming.id,
          text: incoming.text,
          completed: incoming.completed ?? false,
          version: incoming.version,
          deletedAt: incoming.deletedAt ? new Date(incoming.deletedAt) : null,
        });
        await newTodo.save();
        synced.push(newTodo.toJSON());
      } else if (serverTodo.version > incoming.version) {
        // Server has a newer version — conflict (server wins, but report both)
        conflicts.push({
          server: serverTodo.toJSON(),
          client: {
            id: incoming.id,
            text: incoming.text,
            completed: incoming.completed,
            version: incoming.version,
            createdAt: serverTodo.createdAt,
            updatedAt: new Date(incoming.updatedAt),
            deletedAt: incoming.deletedAt ? new Date(incoming.deletedAt) : null,
          },
        });
        // Keep server version in synced as the source of truth
        synced.push(serverTodo.toJSON());
      } else {
        // Client version >= server version — update server with client data
        serverTodo.text = incoming.text;
        serverTodo.completed = incoming.completed ?? false;
        serverTodo.version = Math.max(serverTodo.version, incoming.version) + 1;
        serverTodo.deletedAt = incoming.deletedAt
          ? new Date(incoming.deletedAt)
          : serverTodo.deletedAt; // preserve existing deletedAt if client didn't delete

        await serverTodo.save();
        synced.push(serverTodo.toJSON());
      }
    }

    res.json({ synced, conflicts });
  } catch (err) {
    res.status(500).json({ error: "Sync failed" });
  }
});

// GET /api/todos/sync-status — returns last sync timestamp
router.get("/sync-status", (_req: Request, res: Response) => {
  res.json({ lastSync: lastSyncTimestamp });
});

export default router;
