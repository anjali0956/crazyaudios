import mongoose from "mongoose";

const TrafficEventSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, index: true },
    path: { type: String, required: true, index: true },
    referrer: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.TrafficEvent ||
  mongoose.model("TrafficEvent", TrafficEventSchema);
