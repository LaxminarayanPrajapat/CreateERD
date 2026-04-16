/**
 * Property-based tests for validateSchema
 *
 * Property 2: Validation Soundness — Valid iff No Errors
 *   Validates: Requirements 4.6, 4.7, 4.8
 *
 * Property 3: Validation Rejects Invalid Schemas
 *   Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 2.6, 2.7, 2.8, 2.9
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { validateSchema } from './schemaValidator'
import type {
    Attribute,
    Cardinality,
    DataType,
    Entity,
    Relationship,
    SchemaModel,
} from '../types/schema'

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbDataType: fc.Arbitrary<DataType> = fc.constantFrom(
    'INT', 'BIGINT', 'SMALLINT', 'VARCHAR', 'TEXT', 'CHAR',
    'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE',
    'DECIMAL', 'UUID'
)

const arbCardinality: fc.Arbitrary<Cardinality> = fc.constantFrom('1', 'M', 'N')

function arbAttribute(
    entityId: string,
    overrides?: Partial<Attribute>
): fc.Arbitrary<Attribute> {
    return fc.record({
        id: fc.uuid(),
        entityId: fc.constant(entityId),
        name: fc.string({ minLength: 1, maxLength: 20 }),
        dataType: arbDataType,
        isKey: fc.boolean(),
        isMultivalued: fc.boolean(),
        isNullable: fc.boolean(),
        isDerived: fc.boolean(),
    }).map((attr) => ({ ...attr, ...overrides }))
}

/** Generates a valid non-weak Entity: ≥1 attribute, exactly 1 key attribute */
function arbValidEntity(): fc.Arbitrary<Entity> {
    return fc.uuid().chain((id) =>
        fc.record({
            id: fc.constant(id),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            isWeak: fc.constant(false),
            attributes: fc
                .array(arbAttribute(id, { isKey: false }), { minLength: 1, maxLength: 3 })
                .map((attrs) => {
                    // Ensure exactly one key attribute
                    const keyIdx = 0
                    return attrs.map((a, i) => ({ ...a, isKey: i === keyIdx }))
                }),
        })
    )
}

/** Generates a valid weak Entity: isWeak=true, ≥1 attribute, no key attributes required */
function arbValidWeakEntity(): fc.Arbitrary<Entity> {
    return fc.uuid().chain((id) =>
        fc.record({
            id: fc.constant(id),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            isWeak: fc.constant(true),
            attributes: fc.array(
                arbAttribute(id, { isKey: false }),
                { minLength: 1, maxLength: 3 }
            ),
        })
    )
}

/**
 * Generates a fully valid SchemaModel:
 * - 1–5 entities (non-weak), each with 1–4 attributes, exactly 1 key
 * - 0–3 relationships referencing valid entity IDs
 * - Weak entities (if any) have a corresponding weak relationship
 * - Unique entity names
 */
function arbValidSchema(): fc.Arbitrary<SchemaModel> {
    return fc
        .array(arbValidEntity(), { minLength: 1, maxLength: 5 })
        .chain((rawEntities) => {
            // Deduplicate entity names
            const seen = new Set<string>()
            const entities: Entity[] = []
            for (const e of rawEntities) {
                if (!seen.has(e.name)) {
                    seen.add(e.name)
                    entities.push(e)
                }
            }
            if (entities.length === 0) {
                // Fallback: at least one entity with a fixed name
                const fallback: Entity = {
                    id: 'fallback-id',
                    name: 'Entity',
                    isWeak: false,
                    attributes: [
                        {
                            id: 'attr-id',
                            entityId: 'fallback-id',
                            name: 'id',
                            dataType: 'INT',
                            isKey: true,
                            isMultivalued: false,
                            isNullable: false,
                            isDerived: false,
                        },
                    ],
                }
                entities.push(fallback)
            }

            const entityIds = entities.map((e) => e.id)

            const arbRelationship = fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 20 }),
                isWeak: fc.constant(false),
                entityAId: fc.constantFrom(...entityIds),
                entityBId: fc.constantFrom(...entityIds),
                cardinalityA: arbCardinality,
                cardinalityB: arbCardinality,
                attributes: fc.constant([]),
            })

            return fc.record({
                entities: fc.constant(entities),
                relationships: fc.array(arbRelationship, { minLength: 0, maxLength: 3 }),
                version: fc.constant('1.0'),
            })
        })
}

// ---------------------------------------------------------------------------
// Concrete unit tests
// ---------------------------------------------------------------------------

describe('validateSchema — unit tests', () => {
    it('accepts a minimal valid schema', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1',
                    name: 'User',
                    isWeak: false,
                    attributes: [
                        {
                            id: 'a1', entityId: 'e1', name: 'id',
                            dataType: 'INT', isKey: true,
                            isMultivalued: false, isNullable: false, isDerived: false,
                        },
                    ],
                },
            ],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('rejects duplicate entity names', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1', name: 'User', isWeak: false,
                    attributes: [{ id: 'a1', entityId: 'e1', name: 'id', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false }],
                },
                {
                    id: 'e2', name: 'User', isWeak: false,
                    attributes: [{ id: 'a2', entityId: 'e2', name: 'id', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false }],
                },
            ],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects entity with no attributes', () => {
        const schema: SchemaModel = {
            entities: [{ id: 'e1', name: 'Empty', isWeak: false, attributes: [] }],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-weak entity with no key attribute', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1', name: 'NoKey', isWeak: false,
                    attributes: [{ id: 'a1', entityId: 'e1', name: 'col', dataType: 'VARCHAR', isKey: false, isMultivalued: false, isNullable: true, isDerived: false }],
                },
            ],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-weak entity with multiple key attributes', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1', name: 'MultiKey', isWeak: false,
                    attributes: [
                        { id: 'a1', entityId: 'e1', name: 'id1', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false },
                        { id: 'a2', entityId: 'e1', name: 'id2', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false },
                    ],
                },
            ],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects relationship referencing non-existent entityAId', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1', name: 'User', isWeak: false,
                    attributes: [{ id: 'a1', entityId: 'e1', name: 'id', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false }],
                },
            ],
            relationships: [
                { id: 'r1', name: 'Rel', isWeak: false, entityAId: 'nonexistent', entityBId: 'e1', cardinalityA: '1', cardinalityB: 'M', attributes: [] },
            ],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects weak entity with no weak relationship', () => {
        const schema: SchemaModel = {
            entities: [
                {
                    id: 'e1', name: 'Strong', isWeak: false,
                    attributes: [{ id: 'a1', entityId: 'e1', name: 'id', dataType: 'INT', isKey: true, isMultivalued: false, isNullable: false, isDerived: false }],
                },
                {
                    id: 'e2', name: 'Weak', isWeak: true,
                    attributes: [{ id: 'a2', entityId: 'e2', name: 'col', dataType: 'VARCHAR', isKey: false, isMultivalued: false, isNullable: true, isDerived: false }],
                },
            ],
            relationships: [],
            version: '1.0',
        }
        const result = validateSchema(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// Property 2: Validation Soundness — Valid iff No Errors
// Validates: Requirements 4.6, 4.7, 4.8
// ---------------------------------------------------------------------------

describe('Property 2: Validation Soundness', () => {
    it('valid iff no errors — for any valid schema', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                const result = validateSchema(schema)
                // Biconditional: valid === true iff errors.length === 0
                expect(result.valid).toBe(result.errors.length === 0)
            })
        )
    })

    it('valid iff no errors — biconditional holds for deliberately invalid schemas', () => {
        // Generate schemas with a duplicate entity name to ensure we also test invalid paths
        const arbInvalidSchema = arbValidSchema().chain((schema) => {
            if (schema.entities.length === 0) return fc.constant(schema)
            // Duplicate the first entity's name onto a new entity
            const first = schema.entities[0]
            const dupEntity: Entity = {
                id: 'dup-id',
                name: first.name, // duplicate name
                isWeak: false,
                attributes: [
                    {
                        id: 'dup-attr',
                        entityId: 'dup-id',
                        name: 'id',
                        dataType: 'INT',
                        isKey: true,
                        isMultivalued: false,
                        isNullable: false,
                        isDerived: false,
                    },
                ],
            }
            return fc.constant({
                ...schema,
                entities: [...schema.entities, dupEntity],
            })
        })

        fc.assert(
            fc.property(arbInvalidSchema, (schema) => {
                const result = validateSchema(schema)
                // Biconditional must always hold regardless of validity
                expect(result.valid).toBe(result.errors.length === 0)
            })
        )
    })

    it('idempotence — same result on repeated calls', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                const result1 = validateSchema(schema)
                const result2 = validateSchema(schema)
                expect(result1.valid).toBe(result2.valid)
                expect(result1.errors).toEqual(result2.errors)
            })
        )
    })
})

// ---------------------------------------------------------------------------
// Property 3: Validation Rejects Invalid Schemas
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 2.6, 2.7, 2.8, 2.9
// ---------------------------------------------------------------------------

describe('Property 3: Validation Rejects Invalid Schemas', () => {
    it('rejects schema with duplicate entity names', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                if (schema.entities.length === 0) return
                // Introduce a duplicate name
                const first = schema.entities[0]
                const dupEntity: Entity = {
                    id: 'dup-' + first.id,
                    name: first.name,
                    isWeak: false,
                    attributes: [
                        {
                            id: 'dup-attr',
                            entityId: 'dup-' + first.id,
                            name: 'id',
                            dataType: 'INT',
                            isKey: true,
                            isMultivalued: false,
                            isNullable: false,
                            isDerived: false,
                        },
                    ],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    entities: [...schema.entities, dupEntity],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with entity having no attributes', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                // Add an entity with no attributes
                const emptyEntity: Entity = {
                    id: 'empty-entity-id',
                    name: 'EmptyEntity_unique_xyz',
                    isWeak: false,
                    attributes: [],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    entities: [...schema.entities, emptyEntity],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with non-weak entity having no key attribute', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                // Add a non-weak entity with attributes but none are key
                const noKeyEntity: Entity = {
                    id: 'nokey-entity-id',
                    name: 'NoKeyEntity_unique_xyz',
                    isWeak: false,
                    attributes: [
                        {
                            id: 'nokey-attr',
                            entityId: 'nokey-entity-id',
                            name: 'col',
                            dataType: 'VARCHAR',
                            isKey: false,
                            isMultivalued: false,
                            isNullable: true,
                            isDerived: false,
                        },
                    ],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    entities: [...schema.entities, noKeyEntity],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with non-weak entity having multiple key attributes', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                // Add a non-weak entity with two key attributes
                const multiKeyEntity: Entity = {
                    id: 'multikey-entity-id',
                    name: 'MultiKeyEntity_unique_xyz',
                    isWeak: false,
                    attributes: [
                        {
                            id: 'mk-attr1',
                            entityId: 'multikey-entity-id',
                            name: 'id1',
                            dataType: 'INT',
                            isKey: true,
                            isMultivalued: false,
                            isNullable: false,
                            isDerived: false,
                        },
                        {
                            id: 'mk-attr2',
                            entityId: 'multikey-entity-id',
                            name: 'id2',
                            dataType: 'INT',
                            isKey: true,
                            isMultivalued: false,
                            isNullable: false,
                            isDerived: false,
                        },
                    ],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    entities: [...schema.entities, multiKeyEntity],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with relationship referencing non-existent entityAId', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                if (schema.entities.length === 0) return
                const badRel: Relationship = {
                    id: 'bad-rel-id',
                    name: 'BadRelA',
                    isWeak: false,
                    entityAId: 'nonexistent-entity-id-A',
                    entityBId: schema.entities[0].id,
                    cardinalityA: '1',
                    cardinalityB: 'M',
                    attributes: [],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    relationships: [...schema.relationships, badRel],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with relationship referencing non-existent entityBId', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                if (schema.entities.length === 0) return
                const badRel: Relationship = {
                    id: 'bad-rel-id',
                    name: 'BadRelB',
                    isWeak: false,
                    entityAId: schema.entities[0].id,
                    entityBId: 'nonexistent-entity-id-B',
                    cardinalityA: '1',
                    cardinalityB: 'M',
                    attributes: [],
                }
                const invalid: SchemaModel = {
                    ...schema,
                    relationships: [...schema.relationships, badRel],
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })

    it('rejects schema with weak entity having no weak relationship', () => {
        fc.assert(
            fc.property(arbValidSchema(), (schema) => {
                // Add a weak entity with no corresponding weak relationship
                const weakEntity: Entity = {
                    id: 'orphan-weak-id',
                    name: 'OrphanWeak_unique_xyz',
                    isWeak: true,
                    attributes: [
                        {
                            id: 'ow-attr',
                            entityId: 'orphan-weak-id',
                            name: 'col',
                            dataType: 'VARCHAR',
                            isKey: false,
                            isMultivalued: false,
                            isNullable: true,
                            isDerived: false,
                        },
                    ],
                }
                // Ensure no existing weak relationship references this entity
                const invalid: SchemaModel = {
                    ...schema,
                    entities: [...schema.entities, weakEntity],
                    // Keep existing relationships (none reference orphan-weak-id)
                }
                const result = validateSchema(invalid)
                expect(result.valid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
            })
        )
    })
})
