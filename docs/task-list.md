# Clavicula Task List

## Orchestration Metadata

```yaml
project: "@grimoire/clavicula"
version: "0.1.0"
total_prs: 12
parallel_blocks: 4
```
---
## Dependency Block 1: Foundation

### PR-000: Lemegeton Setup
---
pr_id: PR-000
title: Lemegeton Setup
cold_state: completed
priority: high
complexity:
  score: 2
  estimated_minutes: 15
  suggested_model: haiku
  rationale: Standard Lemegeton configuration with no custom logic
dependencies: []
estimated_files:
  - path: docs/task-list.md
    action: create
    description: Task list document (this file)
  - path: docs/prd.md
    action: create
    description: Product requirements document
---
**Description:**
Initialize Lemegeton orchestration for the Clavicula project. Set up the task-list.md and ensure the PRD is in place for agent coordination.

**Acceptance Criteria:**
- [ ] docs/task-list.md exists with valid YAML frontmatter
- [ ] docs/prd.md exists with complete specification
- [ ] Lemegeton can parse and claim PRs
---
### PR-001: Monorepo Package Structure
---
pr_id: PR-001
title: Monorepo Package Structure
cold_state: completed
priority: high
complexity:
  score: 3
  estimated_minutes: 20
  suggested_model: haiku
  rationale: Standard npm workspace configuration with predictable structure
dependencies: [PR-000]
estimated_files:
  - path: package.json
    action: create
    description: Root workspace configuration
  - path: packages/clavicula/package.json
    action: create
    description: Core package configuration
  - path: packages/clavicula-react/package.json
    action: create
    description: React adapter package configuration
  - path: packages/clavicula-vue/package.json
    action: create
    description: Vue adapter package configuration
  - path: packages/clavicula-solid/package.json
    action: create
    description: Solid adapter package configuration
  - path: packages/clavicula-angular/package.json
    action: create
    description: Angular adapter package configuration
---
**Description:**
Set up npm workspaces monorepo structure with all five packages. Configure ES modules, exports maps, and peer dependencies as specified in the PRD. Install Vitest for testing.

**Acceptance Criteria:**
- [ ] Root package.json with workspaces configured
- [ ] Core package.json with correct exports map
- [ ] All adapter package.json files with correct peer dependencies
- [ ] `npm install` succeeds without errors
---
## Dependency Block 2: Core Implementation

### PR-002: Core Store Implementation
---
pr_id: PR-002
title: Core Store Implementation
cold_state: completed
priority: high
complexity:
  score: 4
  estimated_minutes: 25
  suggested_model: sonnet
  rationale: Core reactive primitives requiring careful EventTarget usage
dependencies: [PR-001]
estimated_files:
  - path: packages/clavicula/index.js
    action: create
    description: createStore, derived, withPersist implementations
---
**Description:**
Implement the core Clavicula library with createStore (EventTarget-backed reactive store), derived (computed read-only stores), and withPersist (localStorage decorator). Total ~60 lines following the PRD specification exactly.

**Acceptance Criteria:**
- [ ] createStore returns object with get(), set(), subscribe() methods
- [ ] set() accepts both partial objects and updater functions
- [ ] subscribe() returns unsubscribe function
- [ ] derived() computes from single or multiple stores
- [ ] derived() uses Object.is for equality checking
- [ ] derived() includes destroy() method
- [ ] withPersist() syncs with localStorage
- [ ] withPersist() handles corrupt data gracefully
---
### PR-003: Core Type Declarations
---
pr_id: PR-003
title: Core Type Declarations
cold_state: completed
priority: high
complexity:
  score: 3
  estimated_minutes: 20
  suggested_model: haiku
  rationale: Type declarations are specified verbatim in PRD
dependencies: [PR-002]
estimated_files:
  - path: packages/clavicula/index.d.ts
    action: create
    description: Store, DerivedStore interfaces and function declarations
---
**Description:**
Create hand-written TypeScript declarations for the core library. Include Store interface, DerivedStore interface, and all three exported functions with proper generics.

**Acceptance Criteria:**
- [ ] Store<T> interface with get(), set(), subscribe()
- [ ] DerivedStore<T> interface with get(), subscribe(), destroy()
- [ ] createStore<T> function declaration
- [ ] derived() overloads for single and multiple stores
- [ ] withPersist<T> function declaration
- [ ] Types compile without errors
---
### PR-004: Core Unit Tests
---
pr_id: PR-004
title: Core Unit Tests
cold_state: completed
priority: high
complexity:
  score: 4
  estimated_minutes: 30
  suggested_model: sonnet
  rationale: Comprehensive test coverage for reactive primitives
dependencies: [PR-002]
estimated_files:
  - path: packages/clavicula/index.test.js
    action: create
    description: Vitest tests for createStore, derived, withPersist
---
**Description:**
Write comprehensive unit tests using Vitest for all core functionality. Test createStore state management, subscription lifecycle, derived computation and equality checks, and withPersist localStorage integration (with mocks).

**Acceptance Criteria:**
- [ ] Tests for createStore get/set/subscribe lifecycle
- [ ] Tests for partial updates and functional updates
- [ ] Tests for subscription and unsubscription
- [ ] Tests for derived with single dependency
- [ ] Tests for derived with multiple dependencies
- [ ] Tests for derived Object.is equality check (no spurious updates)
- [ ] Tests for derived destroy() cleanup
- [ ] Tests for withPersist loading and saving
- [ ] Tests for withPersist corrupt data handling
- [ ] All tests pass with `npm test`
---
## Dependency Block 3: Framework Adapters (Parallel)

### PR-005: React Adapter
---
pr_id: PR-005
title: React Adapter
cold_state: completed
priority: medium
complexity:
  score: 2
  estimated_minutes: 15
  suggested_model: haiku
  rationale: ~5 lines using useSyncExternalStore, well-documented pattern
dependencies: [PR-003]
estimated_files:
  - path: packages/clavicula-react/index.js
    action: create
    description: useStore hook using useSyncExternalStore
  - path: packages/clavicula-react/index.d.ts
    action: create
    description: useStore type declarations
---
**Description:**
Implement React adapter using useSyncExternalStore for external store subscription. The hook accepts a store and optional selector, returning the selected state value.

**Acceptance Criteria:**
- [ ] useStore hook works with Store instances
- [ ] useStore hook works with DerivedStore instances
- [ ] Optional selector parameter works correctly
- [ ] Type declarations export all overloads
---
### PR-006: Vue Adapter
---
pr_id: PR-006
title: Vue Adapter
cold_state: completed
priority: medium
complexity:
  score: 2
  estimated_minutes: 15
  suggested_model: haiku
  rationale: ~6 lines using shallowRef and onUnmounted
dependencies: [PR-003]
estimated_files:
  - path: packages/clavicula-vue/index.js
    action: create
    description: useStore composable using shallowRef
  - path: packages/clavicula-vue/index.d.ts
    action: create
    description: useStore type declarations returning Ref
---
**Description:**
Implement Vue 3 adapter using shallowRef for reactive bindings and onUnmounted for cleanup. Returns a Vue Ref that updates when the store changes.

**Acceptance Criteria:**
- [ ] useStore composable returns a Ref
- [ ] Ref updates when store changes
- [ ] Cleanup on component unmount via onUnmounted
- [ ] Optional selector parameter works correctly
- [ ] Type declarations export all overloads
---
### PR-007: Solid Adapter
---
pr_id: PR-007
title: Solid Adapter
cold_state: completed
priority: medium
complexity:
  score: 2
  estimated_minutes: 15
  suggested_model: haiku
  rationale: ~4 lines using createSignal and onCleanup
dependencies: [PR-003]
estimated_files:
  - path: packages/clavicula-solid/index.js
    action: create
    description: useStore primitive using createSignal
  - path: packages/clavicula-solid/index.d.ts
    action: create
    description: useStore type declarations returning Accessor
---
**Description:**
Implement Solid adapter using createSignal for reactive state and onCleanup for subscription cleanup. Returns an Accessor function that provides current state.

**Acceptance Criteria:**
- [ ] useStore returns an Accessor function
- [ ] Signal updates when store changes
- [ ] Cleanup on disposal via onCleanup
- [ ] Optional selector parameter works correctly
- [ ] Type declarations export all overloads
---
### PR-008: Angular Adapter
---
pr_id: PR-008
title: Angular Adapter
cold_state: completed
priority: medium
complexity:
  score: 3
  estimated_minutes: 20
  suggested_model: haiku
  rationale: ~10 lines with two exports (toObservable, toSignal)
dependencies: [PR-003]
estimated_files:
  - path: packages/clavicula-angular/index.js
    action: create
    description: toObservable and toSignal bridge functions
  - path: packages/clavicula-angular/index.d.ts
    action: create
    description: Type declarations for Observable and Signal returns
---
**Description:**
Implement Angular adapter with two functions: toObservable (for async pipe usage) and toSignal (for Angular 16+ signals). Both bridge Clavicula's subscribe contract to Angular's reactivity.

**Acceptance Criteria:**
- [ ] toObservable returns RxJS Observable
- [ ] Observable emits initial value immediately
- [ ] Observable emits on store changes
- [ ] toSignal returns Angular Signal
- [ ] Signal updates on store changes
- [ ] Type declarations cover both functions
---
## Dependency Block 4: Documentation & Finalization

### PR-009: Core README
---
pr_id: PR-009
title: Core README
cold_state: new
priority: medium
complexity:
  score: 3
  estimated_minutes: 25
  suggested_model: sonnet
  rationale: Technical writing requiring clear examples and design principle explanation
dependencies: [PR-004, PR-005, PR-006, PR-007, PR-008]
estimated_files:
  - path: packages/clavicula/README.md
    action: create
    description: Usage documentation with examples
---
**Description:**
Write comprehensive README for the core package covering design principles (AI-native, platform before framework, composition before configuration, memory before reasoning), complete API reference, usage examples, and Web Components integration pattern.

**Acceptance Criteria:**
- [ ] Design principles section explains AI-native approach
- [ ] API reference covers all 7 vocabulary items
- [ ] Usage examples for createStore, derived, withPersist
- [ ] Web Components integration pattern documented
- [ ] Framework adapter section with links
- [ ] "What this library does NOT do" section included
---
### PR-010: Adapter Tests
---
pr_id: PR-010
title: Adapter Tests
cold_state: new
priority: medium
complexity:
  score: 5
  estimated_minutes: 45
  suggested_model: sonnet
  rationale: Testing framework hooks requires mocking framework internals
dependencies: [PR-005, PR-006, PR-007, PR-008]
estimated_files:
  - path: packages/clavicula-react/index.test.js
    action: create
    description: React adapter tests with testing-library
  - path: packages/clavicula-vue/index.test.js
    action: create
    description: Vue adapter tests
  - path: packages/clavicula-solid/index.test.js
    action: create
    description: Solid adapter tests
  - path: packages/clavicula-angular/index.test.js
    action: create
    description: Angular adapter tests
---
**Description:**
Write unit tests for all framework adapters. Use appropriate testing utilities for each framework (React Testing Library, Vue Test Utils, Solid Testing Library). Focus on subscription lifecycle and reactivity integration.

**Acceptance Criteria:**
- [ ] React tests verify useSyncExternalStore integration
- [ ] Vue tests verify shallowRef updates and cleanup
- [ ] Solid tests verify signal updates and cleanup
- [ ] Angular tests verify Observable emissions and Signal updates
- [ ] All adapter tests pass
---
### PR-011: Architecture Documentation and Agent Skill
---
pr_id: PR-011
title: Architecture Documentation and Agent Skill
cold_state: new
priority: low
complexity:
  score: 5
  estimated_minutes: 45
  suggested_model: sonnet
  rationale: Comprehensive documentation including comparison analysis and agent-consumable skill format
dependencies: [PR-009, PR-010]
estimated_files:
  - path: README.md
    action: create
    description: Root README with installation, comparison to Zustand/Redux
  - path: docs/architecture.md
    action: create
    description: Technical architecture decisions and rationale
  - path: docs/clavicula.skill.md
    action: create
    description: Agent-consumable skill explaining the API
---
**Description:**
Create comprehensive project documentation including: (1) Root README with installation instructions and comparison to Zustand and Redux highlighting Clavicula's AI-native design advantages, (2) Architecture documentation explaining design decisions and tradeoffs, (3) Agent Skill file in markdown format that AI agents can consume to understand and use the library API correctly.

**Acceptance Criteria:**
- [ ] README.md with npm installation instructions for all packages
- [ ] README.md comparison table: Clavicula vs Zustand vs Redux
- [ ] README.md explains why Clavicula is better for AI-assisted development
- [ ] docs/architecture.md covers EventTarget choice, Object.is tradeoffs, decorator pattern
- [ ] docs/architecture.md documents performance characteristics and bundle size
- [ ] docs/clavicula.skill.md provides complete API reference in agent-consumable format
- [ ] Skill file includes all method signatures, usage patterns, and common mistakes to avoid
- [ ] Skill file is structured for easy RAG/context injection
---
## Summary

| Block | PRs | Can Run Parallel |
|-------|-----|------------------|
| 1 - Foundation | PR-000, PR-001 | Sequential |
| 2 - Core | PR-002, PR-003, PR-004 | PR-003, PR-004 after PR-002 |
| 3 - Adapters | PR-005, PR-006, PR-007, PR-008 | All parallel after PR-003 |
| 4 - Docs | PR-009, PR-010, PR-011 | PR-009, PR-010 parallel; PR-011 last |

Total estimated time: ~5-6 hours of agent work
Maximum parallelism: 4 PRs (Block 3)
