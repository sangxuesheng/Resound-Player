---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Project UI Safety Reminder

When editing UI in this project, always check whether the change introduces a clipping risk:

- parent has `overflow: hidden` / `overflow-y: hidden`
- child has hover lift like `translateY(-1px)`
- child has expanding shadow / active border / glow
- container is a horizontal rail, tags row, chips row, tabs row, or compact button group

For this repository, prefer the shared safety classes in `src/styles/theme.css` before adding local patches:

- `ui-safe-rail` for horizontal interactive rails
- `ui-safe-group` for compact interactive button groups

Do not keep scattering local fixes like `overflow-y: visible`, `overflow: visible`, or `padding-top: 2px` if the container can use the shared baseline instead.

## 6. Project Button System Reminder

When editing buttons in this project, always check whether the button is a standard control that should reuse the shared button surface instead of defining a new local glass style.

Prefer the shared button system in `src/styles/theme.css`:

- button tokens: `--button-surface-*`
- danger tokens: `--button-danger-*`
- size / radius tokens: `--button-height-*`, `--button-radius-*`
- semantic classes: `.button-surface`, `.button-surface--danger`

Use this rule of thumb:

- regular action buttons, back buttons, search buttons, chips, tabs, menu items, dropdown triggers → should usually reuse the shared button surface
- `AnimatedAppear` buttons should also use `class-name` to connect to the shared button semantics
- special inline playback controls, media-card shells, and large row-click surfaces should not be forced into the standard button surface if their interaction model is meaningfully different

Before adding local button CSS, check whether you're repeating the same pattern:

- `border: 1px solid var(--border)`
- `background: var(--bg-muted)` or glass reflection + muted background
- hover border glow / shadow

If yes, first try reusing the shared button system and then delete the duplicate local surface styles.

Detailed project rule reference:
- `.cursor/rules/ui-safe-rail-and-group.mdc`
- `.cursor/rules/development-spec.mdc`
