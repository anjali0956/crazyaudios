import mongoose from "mongoose";

const SiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    homepageBanners: {
      left: {
        type: String,
        default: "/banners/crazyaudios-banner-left.svg",
      },
      right: {
        type: String,
        default: "/banners/crazyaudios-banner-right.svg",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSettings ||
  mongoose.model("SiteSettings", SiteSettingsSchema);
