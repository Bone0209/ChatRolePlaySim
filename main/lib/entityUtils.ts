
import prisma from './prisma';

type VariableCategory = 'state' | 'persona' | 'parameter';

interface VariableValue {
    val: any;
    vis: string;
}

interface DiffLog {
    add?: Record<string, VariableValue>;
    del?: Record<string, null>;
    upd?: Record<string, VariableValue>;
}

/**
 * Updates a specific key in an entity's category table (T_) and logs the diff to History (H_).
 */
export async function updateEntityVariable(
    entityId: string,
    category: VariableCategory,
    key: string,
    newValue: any,
    visibility: string = 'vis_private'
) {
    if (!prisma) throw new Error("Prisma client not initialized");

    // 1. Determine which tables to access based on category
    const categoryMap = {
        state: {
            t: prisma.tEntityState,
            h: prisma.hEntityState,
            relation: 'currentState',
        },
        persona: {
            t: prisma.tEntityPersona,
            h: prisma.hEntityPersona,
            relation: 'currentPersona',
        },
        parameter: {
            t: prisma.tEntityParameter,
            h: prisma.hEntityParameter,
            relation: 'currentParameter',
        }
    };

    const target = categoryMap[category];
    if (!target) throw new Error(`Invalid category: ${category}`);

    // 2. Fetch current data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentRecord: any = await (target.t as any).findUnique({
        where: { entityId }
    });

    if (!currentRecord) {
        throw new Error(`Current record not found for entity ${entityId} in category ${category}`);
    }

    const currentData = (currentRecord.data as Record<string, any>) || {};
    const oldValueObj = currentData[key];

    // 3. Prepare New Value Object
    const newValueObj: VariableValue = {
        val: newValue,
        vis: visibility
    };

    // 4. Calculate Diff
    const diff: DiffLog = {};
    let hasChange = false;

    if (oldValueObj === undefined) {
        // ADD
        diff.add = { [key]: newValueObj };
        hasChange = true;
    } else {
        // UPDATE (Check if value strictly changed)
        // Simple equality check. For objects/arrays, might need deep compare, but valid types are usually primitives.
        if (JSON.stringify(oldValueObj.val) !== JSON.stringify(newValue)) {
            diff.upd = { [key]: newValueObj };
            hasChange = true;
        } else if (oldValueObj.vis !== visibility) {
            // Visibility change counts as update
            diff.upd = { [key]: newValueObj };
            hasChange = true;
        }
    }

    if (!hasChange) return; // No change, no DB write

    // 5. Update Current State (T_)
    const newData = { ...currentData, [key]: newValueObj };

    // Transactional Update? Ideally yes, but Prisma $transaction requires distinct queries.
    // We can wrap them.
    await prisma.$transaction([
        (target.t as any).update({
            where: { entityId },
            data: { data: newData }
        }),
        (target.h as any).create({
            data: {
                entityId,
                diff: diff as any
            }
        })
    ]);

    console.log(`[EntityUtils] Updated ${category}.${key} for ${entityId}. Logged to History.`);
}
