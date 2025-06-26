import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Upload a document and create vector embeddings
export const uploadDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.string(),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    // Insert the document
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      type: args.type,
    });

    // Schedule embedding generation
    await ctx.scheduler.runAfter(0, api.documentSearch.generateEmbedding, {
      documentId,
    });

    return documentId;
  },
});

// Generate embeddings for a document (internal action)
export const generateEmbedding = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // For now, we'll create a simple text-based search
    // In a real implementation, you would use OpenAI or another embedding service
    // to generate vector embeddings for semantic search

    // Split content into chunks for better search
    const chunks = splitIntoChunks(document.content, 500);

    for (let i = 0; i < chunks.length; i++) {
      await ctx.db.insert("documentChunks", {
        documentId: args.documentId,
        chunkIndex: i,
        content: chunks[i],
        // In a real implementation, you would add:
        // embedding: await generateEmbeddingVector(chunks[i])
      });
    }

    return null;
  },
});

// Search documents using text search (would be vector search in production)
export const searchDocuments = query({
  args: {
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      title: v.string(),
      content: v.string(),
      type: v.string(),
      score: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return [];
    }

    // Get all documents and perform simple text search
    // In production, this would use vector search
    const allDocuments = await ctx.db.query("documents").collect();

    const results = allDocuments
      .map((doc) => {
        // Simple text matching score
        const queryLower = args.query.toLowerCase();
        const contentLower = doc.content.toLowerCase();
        const titleLower = doc.title.toLowerCase();

        let score = 0;

        // Title matches are weighted higher
        if (titleLower.includes(queryLower)) {
          score += 0.5;
        }

        // Count content matches
        const matches = (contentLower.match(new RegExp(queryLower, "g")) || []).length;
        score += matches * 0.1;

        return {
          ...doc,
          score,
        };
      })
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Limit to top 10 results

    return results;
  },
});

// Get all documents
export const getAllDocuments = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      title: v.string(),
      content: v.string(),
      type: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("documents").order("desc").collect();
  },
});

// Delete a document and its chunks
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete the document
    await ctx.db.delete(args.documentId);

    // Delete associated chunks
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    return null;
  },
});

// Helper function to split text into chunks
function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
    } else {
      currentChunk += (currentChunk.length > 0 ? ". " : "") + sentence.trim();
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}
