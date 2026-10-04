import mongoose from "mongoose";

// Atomic sequences, e.g. { _id: "invoice:2026-27", seq: 123 }.
const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

delete mongoose.models.Counter;

export default mongoose.model("Counter", CounterSchema);
