import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Define the table for storing image metadata
  images: defineTable({
    // Reference to the file in Convex storage
    storageId: v.id("_storage"),
    // Original file name
    fileName: v.string(),
    // File MIME type
    type: v.string(),
    // Timestamp when the image was uploaded
    uploadedAt: v.number()
  })
});
