# ADR-008 — Agent Output Truncation Handling

**Status:** ACCEPTED (pre-filled — enforce these limits)  
**Date:** [DATE]  
**Based on:** a real long-output agent failure pattern

---

## Context

AI agents have a maximum output token limit per response. When generating large code files, design documents, or scripts, the agent will truncate output mid-function, mid-sentence, or mid-block — producing unusable artifacts. Bouncing the stage back does not fix this if the same prompt is used — the agent truncates at the same point every time.

**Lesson:** A generated script needed ~25,000 characters. The agent truncated at ~8,000 characters on every attempt. Three bounces. Same result each time. The fix required: (1) detecting truncation at artifact-save time, (2) changing the prompt to request chunked output, (3) auto-requesting continuation.

---

## Safe Output Limits

These are conservative limits — stay under them for reliable output:

| Output Type | Safe limit | At-risk limit |
|-------------|-----------|---------------|
| Code (single file) | 500 lines | >800 lines |
| Markdown document | 3,000 words | >5,000 words |
| JSON/YAML config | 200 lines | >400 lines |
| SQL migrations | 100 statements | >200 statements |

---

## Decision

### 1. Truncation Detection at Artifact Save
**All artifacts MUST be validated before marking a stage complete:**

```javascript
function detectTruncation(content, outputFormat) {
  if (!content || content.length < 100) return true;
  
  if (outputFormat === 'code') {
    // Code must not end mid-function
    const lastChars = content.slice(-200);
    if (lastChars.match(/\{\s*$/) || lastChars.match(/,\s*$/)) return true;
    // Must end with closing brace or comment
    if (!lastChars.match(/[}\);][\s\n]*$/)) return true;
  }
  
  if (outputFormat === 'markdown') {
    // Must not end mid-sentence (no period or list item at end)
    const lastLine = content.trim().split('\n').pop();
    if (!lastLine.match(/[.!?`\-\*]$/) && !lastLine.match(/^#+/)) return true;
  }
  
  return false;
}

// In workflow stage execution:
if (detectTruncation(artifact.content, stage.output_format)) {
  // Auto-request continuation before marking stage complete
  const continuation = await requestContinuation(artifact.content, stage);
  artifact.content = artifact.content + '\n\n' + continuation;
}
```

### 2. Chunked Generation Instruction (Required for Large Outputs)
**All prompts for outputs >500 lines MUST include:**

```
If your output will exceed 8000 tokens:
- Split into parts: Part 1/N, Part 2/N, ... Part N/N
- End Part 1 with: // CONTINUES IN PART 2
- Begin Part 2 with: // CONTINUED FROM PART 1
- Each part must be syntactically complete (compilable/runnable on its own)
- Do NOT stop mid-function or mid-block
```

### 3. Continuation Prompt Template
When truncation is detected, automatically send:

```
The previous response was truncated. 
The output ended with:
"""
[LAST 500 CHARS OF TRUNCATED ARTIFACT]
"""

Continue from exactly where it left off. 
Output ONLY the continuation — do not repeat any content from the previous response.
Begin immediately with the next line after the truncation point.
```

### 4. Bounce-Back Instructions for Truncation
When a reviewer detects truncation and bounces, the bounce prompt MUST include:

```
The script was truncated at [TRUNCATION POINT].
Do NOT re-generate from scratch.
Continue from: """[LAST 200 CHARS]"""
Output the remaining content only.
Use chunked format: Part 2/2 — continued from Part 1/2.
```

---

## Consequences

**Positive:**
- Eliminates the "bounce 3x still truncated" failure mode
- Artifacts are always syntactically complete before being marked done

**Negative:**
- Adds latency: truncation detection + continuation request adds 30-60s per large artifact
- Continuation stitching requires post-processing logic in the artifact-save pathway

---

## Checklist

Before starting any stage that generates >500 lines of output:
- [ ] Output size estimated (lines/words)
- [ ] Chunked generation instruction in stage prompt
- [ ] Truncation detection enabled in artifact save handler
- [ ] Continuation prompt template configured for this stage
