import type { SchemaModel, ValidationResult } from '../types/schema'

/**
 * Validates a SchemaModel against all schema integrity rules.
 *
 * Rules checked:
 * 1. All entity names are unique within the schema
 * 2. Every entity has at least one attribute
 * 3. Every non-weak entity has exactly one key attribute (isKey === true)
 * 4. Every relationship's entityAId and entityBId reference existing entity IDs
 * 5. Every weak entity has at least one weak relationship referencing it
 *
 * Postcondition: result.valid === true iff result.errors.length === 0
 */
export function validateSchema(schema: SchemaModel): ValidationResult {
    const errors: string[] = []

    const entityIds = new Set(schema.entities.map((e) => e.id))

    // Rule 1: All entity names must be unique
    const seenNames = new Set<string>()
    for (const entity of schema.entities) {
        if (seenNames.has(entity.name)) {
            errors.push(`Duplicate entity name: "${entity.name}"`)
        } else {
            seenNames.add(entity.name)
        }
    }

    for (const entity of schema.entities) {
        // Rule 2: Every entity must have at least one attribute
        if (entity.attributes.length === 0) {
            errors.push(`Entity "${entity.name}" has no attributes`)
        }

        // Rule 3: Every non-weak entity must have exactly one key attribute
        if (!entity.isWeak) {
            const keyCount = entity.attributes.filter((a) => a.isKey).length
            if (keyCount !== 1) {
                errors.push(
                    `Non-weak entity "${entity.name}" must have exactly one key attribute, but has ${keyCount}`
                )
            }
        }
    }

    // Rule 4: Every relationship must reference existing entity IDs
    for (const rel of schema.relationships) {
        if (!entityIds.has(rel.entityAId)) {
            errors.push(
                `Relationship "${rel.name}" references non-existent entity ID "${rel.entityAId}" (entityAId)`
            )
        }
        if (!entityIds.has(rel.entityBId)) {
            errors.push(
                `Relationship "${rel.name}" references non-existent entity ID "${rel.entityBId}" (entityBId)`
            )
        }
    }

    // Rule 5: Every weak entity must have at least one weak relationship referencing it
    const weakEntities = schema.entities.filter((e) => e.isWeak)
    for (const weakEntity of weakEntities) {
        const hasWeakRelationship = schema.relationships.some(
            (rel) =>
                rel.isWeak &&
                (rel.entityAId === weakEntity.id || rel.entityBId === weakEntity.id)
        )
        if (!hasWeakRelationship) {
            errors.push(
                `Weak entity "${weakEntity.name}" has no weak relationship referencing it`
            )
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
