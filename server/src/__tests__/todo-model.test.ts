import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { Todo, ITodoDocument } from "../models/Todo";

// Use a real in-memory model validation test — no MongoDB connection needed
// for basic validation if we just validate documents without saving.

describe("Todo Model", () => {
  beforeAll(async () => {
    // Connect to a throwaway in-memory MongoDB for tests that need save
    // For pure validation tests, we don't need a connection
  });

  afterAll(async () => {
    // Clean up any open connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  describe("Schema validation", () => {
    it("requires id field", async () => {
      const todo = new Todo({
        text: "Buy groceries",
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.id).toBeDefined();
    });

    it("requires text field", async () => {
      const todo = new Todo({
        id: "abc-123",
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.text).toBeDefined();
    });

    it("defaults completed to false", () => {
      const todo = new Todo({
        id: "abc-123",
        text: "Buy groceries",
      });
      expect(todo.completed).toBe(false);
    });

    it("defaults version to 1", () => {
      const todo = new Todo({
        id: "abc-123",
        text: "Buy groceries",
      });
      expect(todo.version).toBe(1);
    });

    it("defaults deletedAt to null", () => {
      const todo = new Todo({
        id: "abc-123",
        text: "Buy groceries",
      });
      expect(todo.deletedAt).toBeNull();
    });

    it("validates a complete valid document", async () => {
      const todo = new Todo({
        id: "abc-123",
        text: "Buy groceries",
        completed: false,
        version: 1,
        deletedAt: null,
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).not.toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it("rejects empty text string", async () => {
      const todo = new Todo({
        id: "abc-123",
        text: "",
      });
      const err = await todo.validate().catch((e: any) => e);
      // Mongoose by default requires non-empty strings for required string fields
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it("rejects null text", async () => {
      const todo = new Todo({
        id: "abc-123",
        text: null,
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it("accepts a completed todo", async () => {
      const todo = new Todo({
        id: "abc-456",
        text: "Completed task",
        completed: true,
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).not.toBeInstanceOf(mongoose.Error.ValidationError);
      expect(todo.completed).toBe(true);
    });

    it("accepts a non-default version", async () => {
      const todo = new Todo({
        id: "abc-789",
        text: "Versioned todo",
        version: 5,
      });
      const err = await todo.validate().catch((e: any) => e);
      expect(err).not.toBeInstanceOf(mongoose.Error.ValidationError);
      expect(todo.version).toBe(5);
    });
  });

  describe("ITodo interface shape", () => {
    it("has all expected fields via toObject", () => {
      const todo = new Todo({
        id: "test-1",
        text: "Test todo",
        completed: true,
        version: 3,
        deletedAt: null,
      });

      const obj = todo.toObject();
      expect(obj).toHaveProperty("id", "test-1");
      expect(obj).toHaveProperty("text", "Test todo");
      expect(obj).toHaveProperty("completed", true);
      expect(obj).toHaveProperty("version", 3);
      expect(obj).toHaveProperty("deletedAt", null);
      // timestamps (createdAt, updatedAt) are set by Mongoose only on save,
      // not on new document construction. Test that the schema defines them.
      expect(todo.schema.paths.createdAt).toBeDefined();
      expect(todo.schema.paths.updatedAt).toBeDefined();
    });
  });
});
