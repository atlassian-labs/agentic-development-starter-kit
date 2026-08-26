# ADR-007 — MCP Tool Integration Contract

**Status:** ACCEPTED (pre-filled — do not deviate without updating this ADR)  
**Date:** [DATE]  
**Based on:** production agent-service patterns and MCP stdio transport patterns

---

## Context

Every project that integrates with an AI coding agent's MCP tools pays a "discovery tax" of 6-10 iterations figuring out the correct endpoint and payload format. This ADR documents the correct contract upfront so teams never have to discover it empirically.

**The endpoints that DON'T work (don't try these):**
```
❌ POST /mcp/tool          → 404 Not Found
❌ POST /chat              → Treats as user message, no structured output
❌ POST /v2/chat           → Works but burns context window unnecessarily
❌ POST /mcp/v1/messages   → Wrong transport (stdio spec, not HTTP)
```

---

## Decision

**All MCP tool calls MUST use `POST /v2/tool`** with this exact payload format:

```javascript
// ✅ CORRECT — Direct tool invocation
const response = await fetch(`http://localhost:${ROVODEV_PORT}/v2/tool`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    tool_name: 'mcp__<toolset>__invoke_tool',   // e.g. 'mcp__gmail__invoke_tool'
    arguments: {
      tool_name: '<actual_tool_name>',           // e.g. 'google_gmail_email_thread_search'
      tool_input: { /* tool-specific params */ }
    }
  })
});
```

---

## Toolset → Tool Name Mapping

| Toolset | `tool_name` wrapper | Example actual tool |
|---------|---------------------|---------------------|
| Gmail | `mcp__gmail__invoke_tool` | `google_gmail_email_thread_search` |
| Google Calendar | `mcp__google_calendar__invoke_tool` | `google_calendar_get_events` |
| chat system | `mcp__chat__invoke_tool` | `chat_channel_get_message` |
| issue tracker | `mcp__docs_or_issues__invoke_tool` | `search_issues` |
| documentation platform | `mcp__docs_or_issues__invoke_tool` | `get_documentation_page` |
| Git hosting provider | `mcp__git__invoke_tool` | `pullRequest` |
| Video tool | `mcp__agent__invoke_tool` | `get_loom_video` |

---

## Response Shape Variants (Known Quirks)

Document these BEFORE building — each MCP tool has unique response shapes:

### Gmail
```javascript
// email_thread_search — returns thread IDs, NOT subjects
{ threads: [{ id, snippet, historyId }] }
// ⚠️ Subject is NOT in thread search — must call email_thread_get with format:'full'

// email_thread_get with format:'full'
{ messages: [{ payload: { headers: [{ name: 'Subject', value: '...' }] } }] }
// ✅ Search ALL messages in thread — subject may only be on first message
```

### Google Calendar
```javascript
// get_events — response shape VARIES:
response.events?.events  // Sometimes here
response.events?.items   // Sometimes here
// ✅ Always check both: const events = r?.events?.events || r?.events?.items || []
```

### chat system
```javascript
// channel_get_message — requires explicit channel permission
// If bot not in channel: returns empty array, not an error
// ✅ Always check if messages array is empty before assuming no messages
```

---

## Pre-Integration Spike Requirement

**Before building any MCP integration:** run this spike test manually and document the response shape:

```javascript
// Spike test template — run this before building
const result = await MCPBridge.callTool('mcp__[toolset]__invoke_tool', {
  tool_name: '[actual_tool]',
  tool_input: { /* minimal valid params */ }
});
console.log('Response keys:', Object.keys(result));
console.log('Sample:', JSON.stringify(result).slice(0, 500));
```

Document the response shape in this ADR under "Response Shape Variants" before writing production code.

---

## Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Token expired | Call `GlobalServeManager.adoptExistingInstance()`, retry once |
| 404 | Wrong endpoint or tool not found | Check tool name spelling, verify toolset is enabled |
| 429 | Rate limited by MCP provider | Exponential backoff, max 3 retries |
| 500 | MCP provider error | Log and surface to user — do not retry silently |

---

## Consequences

**Positive:**
- Eliminates the 6-10 iteration discovery tax per integration
- Response shape quirks documented before they cause production bugs

**Negative:**
- Requires a spike before any integration — adds ~2 hours upfront
- Response shapes may change as MCP tools are updated (review quarterly)
