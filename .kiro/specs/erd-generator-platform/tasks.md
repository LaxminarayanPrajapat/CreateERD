# Implementation Plan: ERD Generator Platform

## Overview

Incremental implementation of a React 18 + TypeScript + Firebase web application for generating Chen notation ERDs. Tasks are ordered so each step builds on the previous: types and services first, then rendering, then UI components, then persistence, then polish. Property-based tests (fast-check) are placed immediately after the code they validate to catch regressions early.

## Tasks

- [x] 1. Project scaffolding and configuration
  - Initialise a Vite + React 18 + TypeScript project with `npm create vite@latest`
  - Install all required dependencies: `firebase`, `react-zoom-pan-pinch`, `d3-force`, `sql-parser-cst`, `jspdf`, `fast-check`, `vitest`, `@testing-library/react`, `@types/d3-force`
  - Create the folder structure: `src/types`, `src/services`, `src/components`, `src/workers`, `src/hooks`, `src/pages`
  - Add `vitest.config.ts` with jsdom environment and coverage settings
  - Add `firebase.ts` config module that reads environment variables for Firebase SDK v10 initialisation (Auth + Firestore)
  - _Requirements: 1.1, 1.2_

- [x] 2. Core TypeScript types and interfaces
  - [x] 2.1 Define all domain types in `src/types/schema.ts`
    - Write `DataType`, `Cardinality`, `ChenShape`, `ExportFormat` union types
    - Write `Attribute`, `Entity`, `Relationship`, `SchemaModel` interfaces matching the design data models
    - Write `ParseError`, `ParseResult`, `ValidationResult` interfaces
    - Write `NodePosition`, `EdgePath`, `LayoutResult`, `LayoutOptions` interfaces
    - Write `SavedDiagram` interface
    - _Requirements: 2.2, 2.3, 3.5, 4.6, 4.7, 6.3, 8.1, 9.1_

- [ ] 3. Schema validation service
  - [ ] 3.1 Implement `validateSchema` in `src/services/schemaValidator.ts`
    - Check all entity names are unique within the schema
    - Check every entity has at least one attribute
    - Check every non-weak entity has exactly one `isKey === true` attribute
    - Check every relationship's `entityAId` and `entityBId` reference existing entity IDs
    - Check every weak entity has at least one weak relationship referencing it
    - Return `ValidationResult` with `valid === true` iff `errors` is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 3.2 Write property tests for `validateSchema`
    - **Property 2: Validation Soundness — Valid iff No Errors**
    - **Validates: Requirements 4.6, 4.7, 4.8**
    - **Property 3: Validation Rejects Invalid Schemas**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 2.6, 2.7, 2.8, 2.9**

- [ ] 4. SQL parser service
  - [ ] 4.1 Implement `sqlParser.parse` in `src/services/sqlParser.ts`
    - Use `sql-parser-cst` to tokenise and parse SQL text
    - Extract table names and column definitions from `CREATE TABLE` statements; map to `Entity` and `Attribute` objects
    - Infer `Relationship` objects from inline `FOREIGN KEY` column constraints within `CREATE TABLE`
    - Infer `Relationship` objects from `FOREIGN KEY` constraints in `ALTER TABLE` statements
    - Record a `ParseError` when a `FOREIGN KEY` references a table not present in the input
    - Record a `ParseError` for duplicate table names
    - Return `ParseResult` with `schema: null` when `errors.length > 0`
    - Return `ParseResult` with empty schema and no errors for empty input
    - Never throw an unhandled exception for any string input
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.9, 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

  - [ ]* 4.2 Write property tests for `sqlParser.parse`
    - **Property 4: SQL Parser Never Throws**
    - **Validates: Requirements 3.9**
    - **Property 5: SQL Parse → Validate Consistency (Round-Trip)**
    - **Validates: Requirements 3.10, 3.2, 3.3, 10.7**
    - **Property 6: SQL Parser Error Detection**
    - **Validates: Requirements 10.4, 10.5**

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Chen notation shape resolver
  - [ ] 6.1 Implement `resolveShape` in `src/services/shapeResolver.ts`
    - Map `Entity` with `isWeak: false` → `'rectangle'`
    - Map `Entity` with `isWeak: true` → `'double-rectangle'`
    - Map `Relationship` with `isWeak: false` → `'diamond'`
    - Map `Relationship` with `isWeak: true` → `'double-diamond'`
    - Map `Attribute` with `isMultivalued: true` → `'double-ellipse'`
    - Map `Attribute` with `isDerived: true` → `'dashed-ellipse'`
    - Map all other `Attribute` → `'ellipse'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write property tests for `resolveShape`
    - **Property 1: Shape Mapping is Total and Correct**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [ ] 7. Layout engine
  - [ ] 7.1 Implement `computeForceDirectedLayout` in `src/services/layoutEngine.ts`
    - Initialise all entity, relationship, and attribute nodes with random positions
    - Run d3-force simulation with configurable repulsion, attraction, and iteration count
    - Apply boundary constraints so all node positions stay within canvas bounds
    - Apply a post-layout overlap correction pass to separate nodes that are too close
    - Return `LayoutResult` with a `nodes` Map and an `edges` array
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [ ]* 7.2 Write property tests for `computeForceDirectedLayout`
    - **Property 7: Layout Completeness**
    - **Validates: Requirements 6.1, 6.3, 6.4**
    - **Property 8: Layout Boundary Invariant**
    - **Validates: Requirements 6.5**

  - [ ] 7.3 Implement layout Web Worker in `src/workers/layoutWorker.ts`
    - Accept a `SchemaModel` and `LayoutOptions` message from the main thread
    - Call `computeForceDirectedLayout` inside the worker
    - Post the `LayoutResult` back to the main thread
    - _Requirements: 6.6, 11.1, 11.2_

  - [ ] 7.4 Implement `useLayoutEngine` hook in `src/hooks/useLayoutEngine.ts`
    - Use the Web Worker when `schema.entities.length > 10`
    - Use the main-thread layout function otherwise
    - Return the `LayoutResult` and a loading flag
    - _Requirements: 6.6, 11.1, 11.2_

- [ ] 8. ERD SVG renderer
  - [ ] 8.1 Implement SVG shape primitives in `src/components/ERDRenderer/shapes.tsx`
    - `renderRectangle(pos)` — single-border rectangle for entities
    - `renderDoubleRectangle(pos)` — double-border rectangle for weak entities
    - `renderDiamond(pos)` — single-border diamond for relationships
    - `renderDoubleDiamond(pos)` — double-border diamond for weak relationships
    - `renderEllipse(pos)` — single-border ellipse for standard attributes
    - `renderDoubleEllipse(pos)` — double-border ellipse for multivalued attributes
    - `renderDashedEllipse(pos)` — dashed-stroke ellipse for derived attributes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 8.2 Implement `ERDRenderer` component in `src/components/ERDRenderer/ERDRenderer.tsx`
    - Render edges (SVG paths) before nodes so they appear behind shapes
    - Render each entity using the correct shape from `resolveShape`
    - Render each relationship using the correct shape from `resolveShape`
    - Render each attribute using the correct shape from `resolveShape`
    - Render key attribute labels with SVG `text-decoration: underline`
    - Render cardinality labels at both endpoints of every relationship edge
    - Produce exactly one SVG `<g>` group per schema element
    - _Requirements: 5.1–5.13_

  - [ ]* 8.3 Write property tests for `ERDRenderer`
    - **Property 9: Renderer Completeness — One Shape Per Element**
    - **Validates: Requirements 5.12, 5.9, 5.10**
    - **Property 10: Renderer Safety — Valid Schema Never Throws**
    - **Validates: Requirements 5.13, 2.5**
    - **Property 11: Cardinality Label Completeness**
    - **Validates: Requirements 5.11**
    - **Property 12: Key Attribute Underline Invariant**
    - **Validates: Requirements 5.8**

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Canvas interactions
  - [ ] 10.1 Wrap `ERDRenderer` with pan/zoom in `src/components/ERDCanvas/ERDCanvas.tsx`
    - Use `react-zoom-pan-pinch` `TransformWrapper` and `TransformComponent` to enable pan and zoom
    - Support scroll-wheel zoom and pinch-to-zoom gestures
    - Support click-and-drag pan on empty canvas space
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Implement node drag interactions in `ERDCanvas`
    - Add pointer event handlers to each node `<g>` group for drag start, move, and end
    - Update the node's position in local state on drag move
    - Recompute edge paths in real time as the node moves
    - _Requirements: 7.3, 7.4_

  - [ ] 10.3 Preserve pan/zoom state on schema updates
    - Store pan offset and zoom level in a ref so they survive SchemaModel updates
    - Do not reset the transform when the schema changes
    - _Requirements: 7.5_

  - [ ]* 10.4 Write property test for canvas state preservation
    - **Property 17: Canvas State Preserved on Schema Update**
    - **Validates: Requirements 7.5**

- [ ] 11. Export service
  - [ ] 11.1 Implement `exportDiagram` in `src/services/exportService.ts`
    - PDF export: use `jsPDF` to embed the rendered SVG as a vector page sized to diagram bounds; return `Blob` with MIME type `application/pdf`
    - JPG export: serialise the SVG to a data URL, draw onto an `HTMLCanvasElement` at 2x resolution with a white background fill, then call `canvas.toBlob` with `image/jpeg`; return the resulting `Blob`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 11.2 Write property tests for `exportDiagram`
    - **Property 13: Export Produces Correct MIME Type and Non-Empty Blob**
    - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 12. SchemaFormEditor component
  - [ ] 12.1 Implement `SchemaFormEditor` in `src/components/SchemaFormEditor/SchemaFormEditor.tsx`
    - Render dynamic form rows for adding, editing, and removing entities (name + weak-entity flag)
    - Render nested attribute rows per entity (name, data type from the 14 supported `DataType` values, key flag, multivalued flag, nullable flag, derived flag)
    - Render relationship rows (name, weak-relationship flag, entity A, entity B, cardinality A, cardinality B)
    - Call `onChange` with an updated `SchemaModel` on every field change for live ERD preview
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.10_

  - [ ] 12.2 Add form validation to `SchemaFormEditor`
    - On submit, call `validateSchema` and block submission if `valid === false`
    - Display a validation error identifying any entity with no attributes (Requirement 2.6)
    - Display a validation error identifying any non-weak entity with no key attribute (Requirement 2.7)
    - Display a validation error identifying duplicate entity names (Requirement 2.8)
    - Display a validation error for relationships referencing non-existent entities (Requirement 2.9)
    - Call `onSubmit` only when validation passes
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9_

- [ ] 13. SQLInputEditor component
  - [ ] 13.1 Implement `SQLInputEditor` in `src/components/SQLInputEditor/SQLInputEditor.tsx`
    - Render a syntax-highlighted `<textarea>` for SQL input
    - Trigger `sqlParser.parse` on button click
    - Implement a 300ms debounce on keystroke-triggered parsing
    - Display inline error markers at the correct line and column for each `ParseError`
    - Call `onParse` with the resulting `SchemaModel` when parsing succeeds with no errors
    - Call `onError` with the `ParseError[]` array when parsing fails
    - _Requirements: 3.1, 3.2, 3.5, 3.8, 10.6, 11.3_

- [ ] 14. Firebase Auth integration
  - [ ] 14.1 Implement `useAuth` hook in `src/hooks/useAuth.ts`
    - Expose `signInWithGoogle()` using `GoogleAuthProvider`
    - Expose `signInWithEmail(email, password)` using `signInWithEmailAndPassword`
    - Expose `signOut()` that clears the session and redirects to the landing page
    - Subscribe to `onAuthStateChanged` to persist the session across page refreshes
    - Return `{ user, loading, error }` state
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 14.2 Implement `AuthGuard` component in `src/components/AuthGuard.tsx`
    - Render children only when the user is authenticated
    - Redirect unauthenticated users to the sign-in page
    - Display a descriptive error message for authentication failures without exposing internal details
    - _Requirements: 1.3, 1.6_

  - [ ]* 14.3 Write property test for unauthenticated access restriction
    - **Property 18: Unauthenticated Access Restriction**
    - **Validates: Requirements 1.6, 9.6**

- [ ] 15. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. DiagramManager component and Firestore persistence
  - [ ] 16.1 Implement `saveDiagram` and `loadDiagrams` in `src/services/diagramService.ts`
    - `saveDiagram(userId, diagram)`: write to `users/{userId}/diagrams/{docId}` with `updatedAt` set to server timestamp; return the document ID
    - `loadDiagrams(userId, pageSize, cursor)`: query only documents under the user's own path; return paginated results of 10 per page
    - Cache the diagram list in React state after the first load to avoid redundant Firestore reads
    - On Firestore write failure, reject the promise so the caller can display an error and preserve local state
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 11.4_

  - [ ] 16.2 Implement `DiagramManager` component in `src/components/DiagramManager/DiagramManager.tsx`
    - List all diagrams belonging to the current user with pagination controls
    - Provide save and load actions; call `saveDiagram` and `loadDiagrams` from the service
    - Show an error notification when a Firestore write fails; preserve unsaved diagram state
    - Show a sign-in prompt when an unauthenticated user attempts to save or load
    - On load, restore the `SchemaModel` and trigger ERD re-render
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 16.3 Write property tests for diagram persistence
    - **Property 14: Diagram Load Round-Trip**
    - **Validates: Requirements 9.7**
    - **Property 15: Diagram Ownership Isolation**
    - **Validates: Requirements 9.3, 9.8, 12.1**
    - **Property 16: Pagination Bound**
    - **Validates: Requirements 9.4**

- [ ] 17. Firestore security rules
  - [ ] 17.1 Write `firestore.rules` at the project root
    - Allow read and write only when `request.auth.uid === userId` for the path `users/{userId}/diagrams/{docId}`
    - Deny all other read and write access
    - _Requirements: 9.8, 12.1_

- [ ] 18. Application routing and layout
  - [ ] 18.1 Set up React Router in `src/main.tsx` and `src/App.tsx`
    - Define routes: `/` (landing / sign-in), `/app` (main editor, auth-guarded), `/diagrams` (diagram list, auth-guarded)
    - Wrap auth-guarded routes with `AuthGuard`
    - _Requirements: 1.5, 1.6_

  - [ ] 18.2 Implement the main editor page in `src/pages/EditorPage.tsx`
    - Compose `SchemaFormEditor`, `SQLInputEditor`, `ERDCanvas`, and `DiagramManager` into a two-panel layout
    - Wire `onChange` / `onParse` callbacks to update shared `SchemaModel` state
    - Pass `SchemaModel` to `useLayoutEngine` and then to `ERDRenderer`
    - Add export buttons that call `exportDiagram` for PDF and JPG
    - _Requirements: 2.4, 3.8, 8.1, 8.2_

  - [ ] 18.3 Add toast notifications and loading states
    - Show a toast on successful diagram save, failed save, and authentication errors
    - Show a loading spinner while layout computation is running in the Web Worker
    - _Requirements: 1.3, 9.5_

- [ ] 19. Content Security Policy
  - Add a `<meta http-equiv="Content-Security-Policy">` tag in `index.html` that restricts script sources to `'self'` and prevents execution of injected SVG content
  - _Requirements: 12.4_

- [ ] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 5, 9, 15, and 20 ensure incremental validation
- Property tests use fast-check and cover all 18 correctness properties from the design document
- Unit tests and property tests are complementary — both should be present for core services
- The Web Worker threshold (>10 entities) is enforced in `useLayoutEngine`, not in the layout engine itself
