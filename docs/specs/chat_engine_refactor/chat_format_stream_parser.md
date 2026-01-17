# Chat Format & Stream Parser Specification

This document defines the chat format used by the StreamParser system and how it should be rendered on the frontend.

## Block Syntax
The chat content is generated as a sequence of blocks. Each block starts with a tag in square brackets.

Syntax: `[type:parameter]\nContent...` or `[type]\nContent...`

### Supported Block Types

#### 1. `[narrative]`
- **Purpose**: Descriptive text, actions, or scene setting.
- **Parameter**: None.
- **Frontend Rendering**:
  - Style: Italic, slightly dimmed color (e.g., text-indigo-300).
  - Display: As part of the message bubble.

#### 2. `[speech:Name]`
- **Purpose**: Character dialogue.
- **Parameter**: Character Name (Required).
- **Frontend Rendering**:
  - Style: Normal text (e.g., text-zinc-100).
  - Note: The name is typically used for the sender bubble title, but within a streamed message, it might just display the content. The frontend may choose to hide the tag and just show the content.

#### 3. `[announce]`
- **Purpose**: System announcements visible to the user.
- **Parameter**: None (Optional).
- **Frontend Rendering**:
  - Style: Centered, emphasized system message.
  - Context: Typically saved as `CHAT_SYSTEM` type in DB.
  - Display: If appearing within a stream, should be visually distinct (e.g., bold, bordered box).

#### 4. `[event]`
- **Purpose**: Internal game events (e.g., `battle:start`).
- **Parameter**: None.
- **Frontend Rendering**:
  - Hidden from normal chat flow, or valid only for debugging.

#### 5. `[log]`
- **Purpose**: Internal logic logs.
- **Parameter**: None.
- **Frontend Rendering**:
  - Hidden.

## Parsing Logic
1. **Regex**: `\[(narrative|speech|announce|event|log|act|scene)(?::(.*?))?\]`
2. **Buffering**: The parser accumulates text until it hits a new tag or end of stream.

## Rendering Example
**Input:**
```
[narrative]
The door creaks open.
[speech:Aria]
Welcome back!
[announce]
Quest Updated: Return Home
```

**Output:**
- *The door creaks open.*
- Welcome back!
- **Quest Updated: Return Home**
