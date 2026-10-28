---
description: Refactor selected code for readability, simplicity, and consistency with existing project conventions.
---

# Refactor code

Refactor the selected code to be straightforward, readable, and maintainable. Preserve its intended behavior and interfaces. Favor the simplest implementation that correctly handles the requirements, without adding defensive complexity.

## First, inspect the context

- Read surrounding code, callers, and relevant utilities before editing.
- Reuse existing API clients, error handling, response parsing, and project conventions.
- Verify which layer owns each responsibility and what existing functions return or throw.
- Keep changes scoped to the selected code and directly necessary dependencies.

## Refactoring rules

1. **Make the main path obvious.** Use early returns, simple conditionals, and linear control flow. Avoid deeply nested callbacks, repeated guards, and scattered success or failure paths.
2. **Keep responsibilities clear.** Separate UI state, business logic, API operations, and resource management where appropriate. Extract functions only when they meaningfully simplify the caller.
3. **Simplify ownership before adding state.** Prefer local variables for operation-specific data. Avoid unnecessary refs, flags, placeholder objects, duplicated state, and synchronization between mutable values.
4. **Remove unnecessary work.** Eliminate redundant validation, repeated state updates, unnecessary transformations, speculative fallbacks, and defensive checks that do not address realistic failures.
5. **Prefer ordinary JavaScript.** Use descriptive names, straightforward expressions, and intermediate variables when helpful. Avoid clever syntax, nested ternaries, dense method chains, and unnecessary abstractions.
6. **Keep formatting compact.** Use line breaks where they improve readability. Avoid both compressed one-line callbacks and excessive vertical formatting.
7. **Handle errors and lifecycles coherently.** Keep failure handling centralized where practical. Ensure asynchronous operations, cancellation, cleanup, and state transitions are correct without introducing scattered identity checks or implicit state machines.
8. **Preserve behavior.** Maintain required validation, derived fields, logging, error handling, and UI behavior. Verify existing contracts before simplifying.
9. **Avoid unnecessary comments.** Code should explain itself. Comment only on non-obvious decisions or constraints.

**Prefer restructuring complicated code over adding guards to compensate for its design.** Every new ref, flag, condition, or abstraction should make the overall implementation easier to understand.

## Preferred patterns

### Example 1: Retrieve orders through the existing API client

When `api.get()` returns parsed data and handles request errors:

```javascript
async function getOrders(userId) {
  const { orders } = await api.get(`/users/${encodeURIComponent(userId)}/orders`);
  return orders;
}
```

Why: Reuses established functionality, preserves the response data, and keeps the request straightforward.

### Example 2: Keep translation UI logic focused

When `getTranslateAPI()` returns parsed translation data and rejects failed requests:

```javascript
async function triggerTranslate(text) {
  setResults(null);

  if (!text.trim()) {
    setStatus('');
    return;
  }

  setStatus('Translating...');

  try {
    const translation = await getTranslateAPI(text);
    setResults(translation);
    setStatus('');
  } catch (error) {
    console.error('Translation failed:', error);
    setStatus('Error: Translation failed');
  }
}
```

Why: State updates are easy to follow, the success path is simple, and HTTP responsibilities remain in the API layer.

## Finish

- Apply the refactor directly when possible.
- Briefly summarize meaningful changes and any reused utilities.
- Identify constraints that prevent further simplification.
- Avoid unrelated changes, additional abstractions, or tests unless necessary to preserve behavior.
