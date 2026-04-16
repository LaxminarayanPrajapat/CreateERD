import type { Timestamp } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

export type DataType =
    | 'INT'
    | 'BIGINT'
    | 'SMALLINT'
    | 'VARCHAR'
    | 'TEXT'
    | 'CHAR'
    | 'BOOLEAN'
    | 'DATE'
    | 'DATETIME'
    | 'TIMESTAMP'
    | 'FLOAT'
    | 'DOUBLE'
    | 'DECIMAL'
    | 'UUID'

export type Cardinality = '1' | 'M' | 'N'

export type ChenShape =
    | 'rectangle'        // Entity
    | 'double-rectangle' // Weak Entity
    | 'diamond'          // Relationship
    | 'double-diamond'   // Weak Relationship
    | 'ellipse'          // Attribute
    | 'double-ellipse'   // Multivalued Attribute
    | 'dashed-ellipse'   // Derived Attribute

export type ExportFormat = 'svg' | 'png' | 'pdf' | 'jpg'

// ---------------------------------------------------------------------------
// Core domain interfaces
// ---------------------------------------------------------------------------

export interface Attribute {
    id: string
    entityId: string
    name: string
    dataType: DataType
    /** Primary key — renders as underlined label */
    isKey: boolean
    /** Renders as double ellipse */
    isMultivalued: boolean
    isNullable: boolean
    /** Renders as dashed ellipse */
    isDerived: boolean
}

export interface Entity {
    /** UUID */
    id: string
    /** Non-empty, unique within schema */
    name: string
    /** Renders as double rectangle */
    isWeak: boolean
    attributes: Attribute[]
}

export interface Relationship {
    id: string
    name: string
    /** Renders as double diamond */
    isWeak: boolean
    entityAId: string
    entityBId: string
    /** Cardinality on entity A's side */
    cardinalityA: Cardinality
    /** Cardinality on entity B's side */
    cardinalityB: Cardinality
    /** Relationship attributes (if any) */
    attributes: Attribute[]
}

export interface SchemaModel {
    entities: Entity[]
    relationships: Relationship[]
    version: string
}

// ---------------------------------------------------------------------------
// Parser interfaces
// ---------------------------------------------------------------------------

export interface ParseError {
    line: number
    column: number
    message: string
}

export interface ParseResult {
    schema: SchemaModel | null
    errors: ParseError[]
}

// ---------------------------------------------------------------------------
// Validation interface
// ---------------------------------------------------------------------------

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

// ---------------------------------------------------------------------------
// Layout interfaces
// ---------------------------------------------------------------------------

/** A simple 2-D point used in edge paths. */
export interface Point {
    x: number
    y: number
}

export interface NodePosition {
    x: number
    y: number
    width: number
    height: number
}

export interface EdgePath {
    fromId: string
    toId: string
    points: Point[]
    cardinalityLabel: string
}

export interface LayoutResult {
    nodes: Map<string, NodePosition>
    edges: EdgePath[]
}

export interface LayoutOptions {
    layoutAlgorithm: 'force-directed' | 'hierarchical' | 'grid'
    canvasWidth: number
    canvasHeight: number
    iterations?: number
    repulsion?: number
    attraction?: number
}

// ---------------------------------------------------------------------------
// Persistence interface
// ---------------------------------------------------------------------------

export interface SavedDiagram {
    id: string
    name: string
    schema: SchemaModel
    /** Firebase Firestore server timestamp */
    createdAt: Timestamp
    /** Firebase Firestore server timestamp */
    updatedAt: Timestamp
    ownerId: string
}
