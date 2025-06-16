import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to list all stored images
export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    
    // Enhance each image record with its URL
    return Promise.all(
      images.map(async (image) => ({
        ...image,
        url: await ctx.storage.getUrl(image.storageId)
      }))
    );
  },
});

// Generate a secure upload URL for uploading an image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // This creates a short-lived upload URL that the client can use
    return await ctx.storage.generateUploadUrl();
  },
});

// Save an uploaded image to the database
export const saveImage = mutation({
  args: { 
    storageId: v.id("_storage"),
    fileName: v.string(),
    type: v.string()
  },
  handler: async (ctx, args) => {
    // Save the image metadata and storage ID in the database
    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      fileName: args.fileName,
      type: args.type,
      uploadedAt: Date.now()
    });
    
    // Return the URL and the database ID
    return {
      id: imageId,
      url: await ctx.storage.getUrl(args.storageId)
    };
  },
});

// Get a specific image by ID
export const getImageUrl = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return null;
    }
    
    return {
      ...image,
      url: await ctx.storage.getUrl(image.storageId)
    };
  },
});
