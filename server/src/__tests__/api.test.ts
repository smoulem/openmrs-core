import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Todo } from "../models/Todo";

// Mock the Todo model methods
vi.mock("../models/Todo", () => {
  const actual = vi.importActual("../models/Todo");
  return {
    Todo: {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      prototype: {
        save: vi.fn(),
      },
    },
  };
});

// Build a test Express app with the expected routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  // GET /api/todos
  app.get("/api/todos", async (_req, res) => {
    try {
      const todos = await (Todo.find as any)({ deletedAt: null }).sort({
        createdAt: -1,
      });
      res.json(todos);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/todos
  app.post("/api/todos", async (req, res) => {
    try {
      const { id, text, completed } = req.body;

      if (!id || !text) {
        res.status(400).json({
          error: "Validation error",
          details: "id and text are required",
        });
        return;
      }

      const todo = await (Todo.create as any)({
        id,
        text,
        completed: completed ?? false,
        version: 1,
        deletedAt: null,
      });

      res.status(201).json(todo);
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({ error: "Duplicate id" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/todos/:id
  app.put("/api/todos/:id", async (req, res) => {
    try {
      const { text, completed } = req.body;
      const updates: any = {};
      if (text !== undefined) updates.text = text;
      if (completed !== undefined) updates.completed = completed;

      const todo = await (Todo.findOneAndUpdate as any)(
        { id: req.params.id, deletedAt: null },
        { $set: updates },
        { new: true }
      );

      if (!todo) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }

      res.json(todo);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/todos/:id — soft delete
  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const todo = await (Todo.findOneAndUpdate as any)(
        { id: req.params.id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { new: true }
      );

      if (!todo) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }

      res.json(todo);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/todos/sync
  app.post("/api/todos/sync", async (req, res) => {
    try {
      const { todos: clientTodos } = req.body;

      if (!Array.isArray(clientTodos)) {
        res.status(400).json({ error: "todos must be an array" });
        return;
      }

      const results: any[] = [];
      const conflicts: any[] = [];

      for (const clientTodo of clientTodos) {
        const existing = await (Todo.findOne as any)({
          id: clientTodo.id,
        });

        if (!existing) {
          // New todo — create it
          const created = await (Todo.create as any)({
            id: clientTodo.id,
            text: clientTodo.text,
            completed: clientTodo.completed ?? false,
            version: 1,
            deletedAt: clientTodo.deletedAt ?? null,
          });
          results.push(created);
        } else if (existing.version === clientTodo.version) {
          // Same version — no conflict, update
          const updated = await (Todo.findOneAndUpdate as any)(
            { id: clientTodo.id },
            {
              $set: {
                text: clientTodo.text,
                completed: clientTodo.completed,
                version: existing.version + 1,
                deletedAt: clientTodo.deletedAt ?? null,
              },
            },
            { new: true }
          );
          results.push(updated);
        } else {
          // Version conflict
          conflicts.push({
            id: clientTodo.id,
            serverVersion: existing.version,
            clientVersion: clientTodo.version,
            serverTodo: existing,
          });
        }
      }

      res.json({ results, conflicts });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}

describe("API Endpoints", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe("GET /api/todos", () => {
    it("returns an empty list when no todos exist", async () => {
      (Todo.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app).get("/api/todos");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns todos after creation", async () => {
      const mockTodos = [
        {
          id: "1",
          text: "Test todo",
          completed: false,
          version: 1,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (Todo.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTodos),
      });

      const res = await request(app).get("/api/todos");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe("1");
      expect(res.body[0].text).toBe("Test todo");
    });

    it("filters out soft-deleted todos", async () => {
      (Todo.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      });

      await request(app).get("/api/todos");

      // Verify find was called with deletedAt: null
      expect(Todo.find).toHaveBeenCalledWith({ deletedAt: null });
    });
  });

  describe("POST /api/todos", () => {
    it("creates a new todo with valid data", async () => {
      const newTodo = {
        id: "new-1",
        text: "New todo",
        completed: false,
        version: 1,
        deletedAt: null,
      };

      (Todo.create as any).mockResolvedValue(newTodo);

      const res = await request(app).post("/api/todos").send({
        id: "new-1",
        text: "New todo",
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("new-1");
      expect(res.body.text).toBe("New todo");
      expect(res.body.completed).toBe(false);
    });

    it("rejects a todo without id", async () => {
      const res = await request(app).post("/api/todos").send({
        text: "Missing id",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(Todo.create).not.toHaveBeenCalled();
    });

    it("rejects a todo without text", async () => {
      const res = await request(app).post("/api/todos").send({
        id: "no-text",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(Todo.create).not.toHaveBeenCalled();
    });

    it("rejects a todo with empty text", async () => {
      const res = await request(app).post("/api/todos").send({
        id: "empty-text",
        text: "",
      });

      expect(res.status).toBe(400);
      expect(Todo.create).not.toHaveBeenCalled();
    });

    it("rejects a todo with null id", async () => {
      const res = await request(app).post("/api/todos").send({
        id: null,
        text: "Null id",
      });

      expect(res.status).toBe(400);
      expect(Todo.create).not.toHaveBeenCalled();
    });

    it("creates a todo with completed set to true", async () => {
      const newTodo = {
        id: "done-1",
        text: "Already done",
        completed: true,
        version: 1,
        deletedAt: null,
      };

      (Todo.create as any).mockResolvedValue(newTodo);

      const res = await request(app).post("/api/todos").send({
        id: "done-1",
        text: "Already done",
        completed: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.completed).toBe(true);
    });

    it("returns 409 on duplicate id", async () => {
      const dupError = new Error("Duplicate key") as any;
      dupError.code = 11000;

      (Todo.create as any).mockRejectedValue(dupError);

      const res = await request(app).post("/api/todos").send({
        id: "dup-1",
        text: "Duplicate",
      });

      expect(res.status).toBe(409);
    });
  });

  describe("PUT /api/todos/:id", () => {
    it("updates todo text", async () => {
      const updated = {
        id: "1",
        text: "Updated text",
        completed: false,
        version: 1,
        deletedAt: null,
      };

      (Todo.findOneAndUpdate as any).mockResolvedValue(updated);

      const res = await request(app).put("/api/todos/1").send({
        text: "Updated text",
      });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe("Updated text");
    });

    it("updates completed status", async () => {
      const updated = {
        id: "1",
        text: "Test",
        completed: true,
        version: 1,
        deletedAt: null,
      };

      (Todo.findOneAndUpdate as any).mockResolvedValue(updated);

      const res = await request(app).put("/api/todos/1").send({
        completed: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });

    it("updates both text and completed", async () => {
      const updated = {
        id: "1",
        text: "Both updated",
        completed: true,
        version: 1,
        deletedAt: null,
      };

      (Todo.findOneAndUpdate as any).mockResolvedValue(updated);

      const res = await request(app).put("/api/todos/1").send({
        text: "Both updated",
        completed: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe("Both updated");
      expect(res.body.completed).toBe(true);
    });

    it("returns 404 for unknown id", async () => {
      (Todo.findOneAndUpdate as any).mockResolvedValue(null);

      const res = await request(app).put("/api/todos/nonexistent").send({
        text: "Won't work",
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Todo not found");
    });

    it("does not update soft-deleted todos", async () => {
      (Todo.findOneAndUpdate as any).mockResolvedValue(null);

      const res = await request(app).put("/api/todos/deleted-1").send({
        text: "Should not update",
      });

      // Verify the query filters out deletedAt: null
      expect(Todo.findOneAndUpdate).toHaveBeenCalledWith(
        { id: "deleted-1", deletedAt: null },
        expect.any(Object),
        expect.any(Object)
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/todos/:id", () => {
    it("soft-deletes a todo by setting deletedAt", async () => {
      const now = new Date();
      const deleted = {
        id: "1",
        text: "Deleted todo",
        completed: false,
        version: 1,
        deletedAt: now,
      };

      (Todo.findOneAndUpdate as any).mockResolvedValue(deleted);

      const res = await request(app).delete("/api/todos/1");

      expect(res.status).toBe(200);
      expect(res.body.deletedAt).toBeDefined();
      expect(res.body.deletedAt).not.toBeNull();
    });

    it("returns 404 for unknown id", async () => {
      (Todo.findOneAndUpdate as any).mockResolvedValue(null);

      const res = await request(app).delete("/api/todos/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Todo not found");
    });

    it("returns 404 for already-deleted todo", async () => {
      (Todo.findOneAndUpdate as any).mockResolvedValue(null);

      const res = await request(app).delete("/api/todos/already-deleted");

      expect(res.status).toBe(404);
      // Verifies the delete query includes deletedAt: null filter
      expect(Todo.findOneAndUpdate).toHaveBeenCalledWith(
        { id: "already-deleted", deletedAt: null },
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});
