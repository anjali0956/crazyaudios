import mongoose from "mongoose";

const UploadAssetSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

delete mongoose.models.UploadAsset;

export default mongoose.model("UploadAsset", UploadAssetSchema);
