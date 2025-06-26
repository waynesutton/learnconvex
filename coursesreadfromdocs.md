# How Courses Read from Convex Documentation Links

This document explains how both course formats (Chat Mode and Cards Mode) integrate with Convex Documentation Links managed through the Admin Playground to enhance learning experiences.

## Overview

The ConvexCourse platform dynamically incorporates official Convex documentation into AI responses to ensure students receive accurate, up-to-date information. Both course formats leverage the same documentation system but apply it differently based on the learning mode.

## System Architecture

### Documentation Storage

- **Database Table**: `convexDocs`
- **Fields**:
  - `docType`: Category identifier (e.g., "home", "llms", "functions")
  - `url`: Direct link to Convex documentation
  - `content`: Optional cached content preview
  - `isActive`: Boolean flag to enable/disable specific docs
  - `lastFetched`: Timestamp of last content update
  - `updatedBy`: Admin who last modified the entry

### Default Documentation Sources

The system initializes with these core Convex documentation links:

```typescript
{
  docType: "home",
  url: "https://docs.convex.dev/home",
  isActive: true,
},
{
  docType: "llms",
  url: "https://docs.convex.dev/llms.txt",
  isActive: true,
}
```

## How LLMs Read Documentation

### 1. Documentation Retrieval Process

Both course modes follow this process:

```typescript
// Get active Convex documentation for enhanced responses
const convexDocs = await ctx.runQuery(api.course.getConvexDocs);
const docReferences = convexDocs
  .filter((doc) => doc.isActive)
  .map((doc) => `- ${doc.docType}: ${doc.url}`)
  .join("\n");
```

### 2. System Prompt Integration

The documentation references are embedded into the AI's system prompt:

**Standard Course Mode** (`convex/course.ts`):

```typescript
const systemPrompt = getBuildAppsSystemPrompt(
  session.difficulty || "beginning",
  session.courseType === "build-apps-cards",
  docReferences // Documentation included here
);
```

**AgentFlow Enhanced Mode** (`convex/courseAgent.ts`):

```typescript
const systemPrompt = `You are an AI instructor powered by AgentFlow teaching developers how to build applications with Convex.dev...

Convex Documentation References:
${docReferences}`;
```

### 3. OpenAI API Integration

The documentation-enhanced system prompt is sent to OpenAI:

```typescript
const messages = [
  { role: "system", content: systemPrompt }, // Contains doc references
  ...session.messages.map((m) => ({ role: m.role, content: m.content })),
  { role: "user", content: args.userMessage },
];

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 800,
    temperature: 0.7,
  }),
});
```

## Course Format Differences

### Chat Mode (build-apps)

- **Interactive Conversations**: Documentation provides context for real-time Q&A
- **Progressive Learning**: AI references docs to build on previous concepts
- **Debugging Help**: Uses docs to provide accurate troubleshooting guidance

### Cards Mode (build-apps-cards)

- **Structured Learning**: Documentation ensures flashcard accuracy
- **Concept Reinforcement**: Cards reference specific doc sections
- **Self-Paced Study**: Students can dive deeper using provided doc links

## Admin Management via Playground

### Accessing Documentation Settings

1. Navigate to Admin Playground
2. Click **⚙️ Settings** button
3. Switch to **Convex Documentation** tab

### Managing Documentation Links

**Adding New Documentation**:

```typescript
await updateConvexDocs({
  docType: "new-feature",
  url: "https://docs.convex.dev/new-feature",
  content: "Preview of new feature docs...",
  isActive: true,
  updatedBy: userEmail,
});
```

**Activating/Deactivating Sources**:

- Toggle `isActive` flag to include/exclude from AI responses
- Immediately affects all new course interactions

**Refreshing Content**:

- Updates `lastFetched` timestamp
- Can fetch and cache content previews for faster access

### Real-Time Impact

Changes to documentation settings have **immediate effect**:

- New sessions get updated documentation context
- Existing sessions continue with their initial context
- AI responses become more accurate and current

## Benefits for Learning

### Enhanced Accuracy

- AI responses align with official Convex documentation
- Reduces outdated or incorrect information
- Ensures consistency across all course interactions

### Current Information

- Documentation links stay updated with latest Convex features
- Students learn current best practices
- New features are automatically incorporated

### Authoritative Sources

- References official Convex documentation
- Builds student confidence in information accuracy
- Encourages exploration of official resources

## Technical Implementation Details

### Query Function

```typescript
export const getConvexDocs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("convexDocs"),
      docType: v.string(),
      url: v.string(),
      content: v.optional(v.string()),
      isActive: v.boolean(),
      // ... other fields
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("convexDocs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});
```

### Mutation Function

```typescript
export const updateConvexDocs = mutation({
  args: {
    docType: v.string(),
    url: v.string(),
    content: v.optional(v.string()),
    isActive: v.boolean(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update or create documentation entry
    // Handles both new additions and updates to existing docs
  },
});
```

## Best Practices for Admins

### Documentation Curation

1. **Keep Active Sources Minimal**: Only enable essential documentation
2. **Regular Reviews**: Periodically check for broken or outdated links
3. **Categorize Properly**: Use clear `docType` identifiers
4. **Monitor Impact**: Review how documentation affects AI responses

### Content Management

1. **Preview Content**: Use the optional `content` field for quick previews
2. **Version Control**: Track who made changes via `updatedBy`
3. **Backup Important Settings**: Document your documentation configuration

### Performance Optimization

1. **Limit Active Sources**: Too many docs can dilute AI focus
2. **Prioritize Core Docs**: Keep fundamental Convex concepts active
3. **Remove Deprecated**: Deactivate outdated documentation promptly

## Troubleshooting

### Common Issues

**AI Not Using Documentation**:

- Check if docs are marked as `isActive: true`
- Verify URLs are accessible
- Confirm documentation is retrieved in system prompt

**Outdated Information**:

- Update `lastFetched` timestamp
- Refresh documentation content
- Check if official docs have moved

**Performance Issues**:

- Reduce number of active documentation sources
- Optimize system prompt length
- Consider caching frequently used content

## Future Enhancements

### Planned Features

1. **Automatic Content Fetching**: Periodically update cached content
2. **Relevance Scoring**: Prioritize docs based on current lesson context
3. **Usage Analytics**: Track which documentation is most referenced
4. **Content Summarization**: AI-generated summaries of lengthy docs

### Integration Possibilities

1. **Search Integration**: Allow AI to search within documentation
2. **Dynamic Loading**: Fetch specific doc sections based on context
3. **Multi-Language Support**: Support for different documentation languages
4. **Version Tracking**: Monitor documentation version changes

## Conclusion

The integration of Convex Documentation Links into both course formats ensures that students receive accurate, authoritative, and up-to-date information throughout their learning journey. The admin-managed system provides flexibility while maintaining consistency, creating a robust foundation for effective Convex education.

By leveraging official documentation sources, the platform bridges the gap between guided learning and independent exploration, empowering students to become confident Convex developers.
