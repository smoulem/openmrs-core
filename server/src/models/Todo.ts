import mongoose, { Schema, Document } from "mongoose";

export interface ITodo {
  id: string; // client-generated UUID
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number; // for conflict detection
  deletedAt: Date | null; // soft delete
}

export interface ITodoDocument extends Omit<ITodo, "id">, Document {
  id: string;
}

const TodoSchema = new Schema<ITodoDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
);

export const Todo = mongoose.model<ITodoDocument>("Todo", TodoSchema);
