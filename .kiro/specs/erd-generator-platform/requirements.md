# Requirements Document

## Introduction

The ERD Generator Platform is a web application that enables IT students to create Entity Relationship Diagrams (ERDs) using standard Chen notation. Users can define database schemas through a guided form-based interface or by pasting SQL CREATE TABLE statements. The platform renders accurate ERDs with proper Chen notation shapes, cardinality labels, and relationship lines. Firebase provides authentication and persistent storage so students can save, revisit, and manage their diagrams.

## Glossary

- **ERD**: Entity Relationship Diagram — a visual representation of a database schema showing entities, attributes, and relationships.
- **Chen Notation**: A standard ERD notation using rectangles for entities, diamonds for relationships, and ellipses for attributes.
- **SchemaModel**: The internal data structure representing a parsed or form-defined database schema, containing entities, relationships, and attributes.
- **Entity**: A distinct object or concept in the database schema, rendered as a rectangle in Chen notation.
- **Weak Entity**: An entity that depends on another entity for its existence, rendered as a double rectangle.
- **Attribute**: A property of an entity or relationship, rendered as an ellipse.
- **Multivalued Attribute**: An attribute that can hold multiple values, rendered as a double ellipse.
- **Derived Attribute**: An attribute whose value is computed from other attributes, rendered as a dashed ellipse.
- **Relationship**: An association between two entities, rendered as a diamond.
- **Weak Relationship**: A relationship that identifies a weak entity, rendered as a double diamond.
- **Cardinality**: The numerical relationship between entity instances (1-1, 1-M, M-1, M-M).
- **SQL Parser**: The client-side service that tokenizes and parses SQL CREATE TABLE statements into a SchemaModel. It never executes SQL against a database.
- **Layout Engine**: The service that computes x/y positions for all nodes in the ERD using a force-directed algorithm.
- **ERD Renderer**: The component that converts a SchemaModel and layout into SVG shapes following Chen notation.
- **DiagramManager**: The component responsible for saving, loading, and listing diagrams in Firestore.
- **Firebase Auth**: The authentication service supporting Google and Email sign-in.
- **Firestore**: The Firebase cloud database used to persist user diagrams.
- **Force-Directed Layout**: A physics-based graph layout algorithm that positions nodes by simulating attraction and repulsion forces.
- **Web Worker**: A browser background thread used to offload computationally intensive layout calculations from the main UI thread.
- **ExportFormat**: One of the supported diagram export formats: PDF or JPG (primary user-facing formats).
- **ParseError**: A structured error object containing line number, column number, and a descriptive message from the SQL Parser.
- **ValidationResult**: The result of schema validation, containing a boolean validity flag and a list of error messages.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As an IT student, I want to sign in with my Google account or email, so that my diagrams are saved to my personal account and accessible across sessions.

#### Acceptance Criteria

1. WHEN a user selects Google sign-in, THE Firebase Auth SHALL authenticate the user using the Google OAuth provider and return a valid user session.
2. WHEN a user provides valid email and password credentials, THE Firebase Auth SHALL authenticate the user and return a valid user session.
3. IF authentication fails due to invalid credentials, THEN THE System SHALL display a descriptive error message to the user without exposing internal error details.
4. WHEN a user is authenticated, THE System SHALL maintain the session across page refreshes until the user explicitly signs out.
5. WHEN a user signs out, THE System SHALL clear the session and redirect the user to the unauthenticated landing page.
6. WHILE a user is unauthenticated, THE System SHALL restrict access to diagram save and load operations and prompt the user to sign in.

---

### Requirement 2: Form-Based Schema Input

**User Story:** As an IT student, I want to define my database schema through a structured form, so that I can build an ERD without writing SQL.

#### Acceptance Criteria

1. THE SchemaFormEditor SHALL allow users to add, edit, and remove entities with a name and a weak-entity flag.
2. THE SchemaFormEditor SHALL allow users to add, edit, and remove attributes for each entity, specifying name, data type, key flag, multivalued flag, nullable flag, and derived flag.
3. THE SchemaFormEditor SHALL allow users to add, edit, and remove relationships between two entities, specifying name, weak-relationship flag, and cardinality on each side (1, M, or N).
4. WHEN a user modifies any field in the form, THE SchemaFormEditor SHALL emit an updated SchemaModel immediately for live ERD preview.
5. WHEN a user submits the form, THE SchemaFormEditor SHALL validate the schema before passing it to the ERD Renderer.
6. IF a form submission contains an entity with no attributes, THEN THE SchemaFormEditor SHALL prevent submission and display a validation error identifying the offending entity.
7. IF a form submission contains a non-weak entity with no key attribute, THEN THE SchemaFormEditor SHALL prevent submission and display a validation error identifying the offending entity.
8. IF a form submission contains duplicate entity names, THEN THE SchemaFormEditor SHALL prevent submission and display a validation error identifying the duplicate names.
9. IF a form submission contains a relationship referencing a non-existent entity, THEN THE SchemaFormEditor SHALL prevent submission and display a validation error.
10. THE SchemaFormEditor SHALL support the following data types for attributes: INT, BIGINT, SMALLINT, VARCHAR, TEXT, CHAR, BOOLEAN, DATE, DATETIME, TIMESTAMP, FLOAT, DOUBLE, DECIMAL, UUID.

---

### Requirement 3: SQL-Based Schema Input

**User Story:** As an IT student, I want to paste SQL CREATE TABLE statements to generate an ERD, so that I can quickly visualize an existing database schema.

#### Acceptance Criteria

1. THE SQLInputEditor SHALL provide a text input area for users to paste or type SQL CREATE TABLE statements.
2. WHEN a user triggers parsing (via button click or debounced input), THE SQL Parser SHALL tokenize and parse the SQL text into a SchemaModel.
3. THE SQL Parser SHALL extract table names and column definitions from CREATE TABLE statements and map them to Entity and Attribute objects in the SchemaModel.
4. THE SQL Parser SHALL infer Relationship objects from FOREIGN KEY constraints found in CREATE TABLE or ALTER TABLE statements.
5. WHEN the SQL Parser encounters a syntax error, THE SQLInputEditor SHALL display an inline error marker at the correct line and column with a descriptive message.
6. IF the SQL input is empty, THEN THE SQL Parser SHALL return a ParseResult with an empty schema and no errors.
7. THE SQL Parser SHALL operate entirely client-side and SHALL NOT execute the SQL input against any database.
8. WHEN parsing succeeds with no errors, THE System SHALL pass the resulting SchemaModel to the ERD Renderer for display.
9. THE SQL Parser SHALL return a ParseResult object containing either a valid SchemaModel or a list of ParseError objects; it SHALL NOT throw an unhandled exception for any string input.
10. THE SQL Parser SHALL produce a SchemaModel that passes schema validation when the input SQL is syntactically and semantically valid.

---

### Requirement 4: Schema Validation

**User Story:** As an IT student, I want the system to validate my schema before rendering, so that I receive clear feedback on errors rather than a broken diagram.

#### Acceptance Criteria

1. THE System SHALL validate that all entity names within a SchemaModel are unique.
2. THE System SHALL validate that every entity has at least one attribute.
3. THE System SHALL validate that every non-weak entity has exactly one attribute with the key flag set to true.
4. THE System SHALL validate that every relationship references entity IDs that exist within the same SchemaModel.
5. THE System SHALL validate that every weak entity has at least one weak relationship referencing it.
6. WHEN validation passes, THE System SHALL return a ValidationResult with valid set to true and an empty errors list.
7. WHEN validation fails, THE System SHALL return a ValidationResult with valid set to false and a non-empty errors list describing each violation.
8. THE System SHALL ensure that ValidationResult.valid is true if and only if ValidationResult.errors is empty.

---

### Requirement 5: ERD Rendering with Chen Notation

**User Story:** As an IT student, I want my schema rendered as a proper Chen notation ERD, so that I can use it for coursework and study.

#### Acceptance Criteria

1. THE ERD Renderer SHALL render each non-weak entity as a rectangle with the entity name as a text label.
2. THE ERD Renderer SHALL render each weak entity as a double rectangle with the entity name as a text label.
3. THE ERD Renderer SHALL render each standard relationship as a diamond with the relationship name as a text label.
4. THE ERD Renderer SHALL render each weak relationship as a double diamond with the relationship name as a text label.
5. THE ERD Renderer SHALL render each standard attribute as an ellipse with the attribute name as a text label.
6. THE ERD Renderer SHALL render each multivalued attribute as a double ellipse with the attribute name as a text label.
7. THE ERD Renderer SHALL render each derived attribute as a dashed ellipse with the attribute name as a text label.
8. THE ERD Renderer SHALL render each key attribute label with an underline to distinguish it from non-key attributes.
9. THE ERD Renderer SHALL render a line connecting each attribute ellipse to its parent entity or relationship node.
10. THE ERD Renderer SHALL render a line connecting each relationship diamond to its two participating entity rectangles.
11. THE ERD Renderer SHALL render a cardinality label at each endpoint of every relationship line, one near the entity A side and one near the entity B side.
12. THE ERD Renderer SHALL produce SVG output containing exactly one shape group per schema element (entity, relationship, or attribute).
13. WHEN a SchemaModel passes validation, THE ERD Renderer SHALL render the ERD without runtime errors.

---

### Requirement 6: Layout Engine

**User Story:** As an IT student, I want the ERD nodes to be automatically positioned in a readable layout, so that I do not have to manually arrange every element.

#### Acceptance Criteria

1. THE Layout Engine SHALL compute x/y positions for every entity, relationship, and attribute node in the SchemaModel.
2. THE Layout Engine SHALL use a force-directed algorithm (d3-force) as the default layout strategy.
3. THE Layout Engine SHALL return a LayoutResult containing a node position map and an edge path list.
4. WHEN the SchemaModel contains at least one entity, THE Layout Engine SHALL assign a position to every node such that the total node count in the LayoutResult equals the sum of all entities, relationships, and attributes in the SchemaModel.
5. THE Layout Engine SHALL constrain all node positions within the specified canvas bounds.
6. WHEN the schema contains more than 10 entities, THE System SHALL offload layout computation to a Web Worker to avoid blocking the main UI thread.
7. WHEN the force-directed layout produces overlapping nodes, THE Layout Engine SHALL apply a post-layout correction pass to separate overlapping nodes.

---

### Requirement 7: Canvas Interactions

**User Story:** As an IT student, I want to pan, zoom, and drag nodes on the ERD canvas, so that I can explore and adjust large diagrams comfortably.

#### Acceptance Criteria

1. THE ERD Canvas SHALL support pan interactions allowing users to translate the viewport by clicking and dragging on empty canvas space.
2. THE ERD Canvas SHALL support zoom interactions allowing users to scale the viewport using scroll wheel or pinch gestures.
3. THE ERD Canvas SHALL support node drag interactions allowing users to reposition individual entity, relationship, and attribute nodes by clicking and dragging them.
4. WHEN a node is dragged to a new position, THE ERD Canvas SHALL update the connecting edge paths in real time to follow the moved node.
5. THE ERD Canvas SHALL preserve the current pan and zoom state when the SchemaModel is updated without a full re-render.

---

### Requirement 8: Diagram Export

**User Story:** As an IT student, I want to export my ERD as a PDF or JPG file, so that I can include it in reports and assignments.

#### Acceptance Criteria

1. THE System SHALL provide an export action that allows users to download the current ERD as a PDF file.
2. THE System SHALL provide an export action that allows users to download the current ERD as a JPG file.
3. WHEN a user exports as PDF, THE System SHALL produce a Blob with MIME type application/pdf containing the ERD as a vector page sized to the diagram bounds.
4. WHEN a user exports as JPG, THE System SHALL produce a Blob with MIME type image/jpeg rasterized at 2x resolution with a white background.
5. WHEN an export action is triggered, THE System SHALL produce a non-empty Blob of the correct MIME type for the requested format.
6. THE System SHALL use jsPDF to generate PDF exports by embedding the rendered SVG as a vector page.

---

### Requirement 9: Diagram Persistence

**User Story:** As an IT student, I want to save and reload my diagrams, so that I can continue working on them across multiple sessions.

#### Acceptance Criteria

1. WHEN an authenticated user saves a diagram, THE DiagramManager SHALL write the diagram data to Firestore at the path users/{userId}/diagrams/{docId} and return the document ID.
2. WHEN an authenticated user saves a diagram, THE DiagramManager SHALL set the updatedAt field to the server timestamp.
3. WHEN an authenticated user loads their diagrams, THE DiagramManager SHALL retrieve only the diagrams owned by that user from Firestore.
4. THE DiagramManager SHALL list diagrams in paginated results of 10 diagrams per page to minimize Firestore reads.
5. IF a Firestore write fails due to a network error or quota limit, THEN THE System SHALL display an error notification to the user and preserve the unsaved diagram state in local application state.
6. IF a user attempts to save a diagram while unauthenticated, THEN THE System SHALL display a sign-in prompt without discarding the current diagram state.
7. WHEN a saved diagram is loaded, THE System SHALL restore the SchemaModel and re-render the ERD to match the saved state.
8. THE System SHALL enforce Firestore security rules such that each user can only read and write documents under their own users/{userId}/diagrams/ path.

---

### Requirement 10: SQL Parser Robustness

**User Story:** As an IT student, I want the SQL parser to handle a wide range of valid SQL inputs and report clear errors for invalid inputs, so that I can trust the generated ERD reflects my schema.

#### Acceptance Criteria

1. THE SQL Parser SHALL parse CREATE TABLE statements containing column definitions with name, data type, and optional constraints (PRIMARY KEY, NOT NULL, UNIQUE).
2. THE SQL Parser SHALL infer relationships from inline FOREIGN KEY column constraints within CREATE TABLE statements.
3. THE SQL Parser SHALL infer relationships from FOREIGN KEY constraints declared in ALTER TABLE statements referencing previously parsed tables.
4. IF the SQL input contains a FOREIGN KEY referencing a table not present in the input, THEN THE SQL Parser SHALL record a ParseError describing the missing reference.
5. IF the SQL input contains duplicate table names, THEN THE SQL Parser SHALL record a ParseError identifying the duplicate.
6. THE SQL Parser SHALL use a 300ms debounce on keystroke-triggered parsing to avoid redundant parse cycles.
7. WHEN parsing completes without errors, THE SQL Parser SHALL produce a SchemaModel where every entity has at least one attribute.

---

### Requirement 11: Performance

**User Story:** As an IT student, I want the application to remain responsive while I build large schemas, so that I am not blocked by slow rendering or layout computation.

#### Acceptance Criteria

1. WHEN the SchemaModel contains 10 or fewer entities, THE Layout Engine SHALL complete layout computation on the main thread within a time that does not cause perceptible UI jank.
2. WHEN the SchemaModel contains more than 10 entities, THE System SHALL delegate layout computation to a Web Worker so that the main UI thread remains responsive during layout.
3. THE SQLInputEditor SHALL debounce SQL parsing by 300 milliseconds so that parsing is not triggered on every individual keystroke.
4. THE DiagramManager SHALL cache the diagram list in React state after the first load to avoid redundant Firestore reads within the same session.
5. WHEN exporting a PNG, THE System SHALL use OffscreenCanvas where the browser supports it to avoid layout thrashing on the main thread.

---

### Requirement 12: Security

**User Story:** As an IT student, I want my data and diagrams to be protected, so that other users cannot access or modify my work.

#### Acceptance Criteria

1. THE System SHALL enforce Firestore security rules that prevent any user from reading or writing documents outside their own users/{userId}/diagrams/ path.
2. THE SQL Parser SHALL treat all SQL input as plain text for parsing only and SHALL NOT execute any SQL statement against any database or external service.
3. THE System SHALL use Firebase Auth for all credential management and SHALL NOT store user passwords in Firestore.
4. THE System SHALL enforce a Content Security Policy that prevents execution of injected SVG content to mitigate XSS attacks.
5. WHEN exporting diagrams, THE System SHALL include only diagram content in the exported file and SHALL NOT embed user credentials or Firebase tokens.
