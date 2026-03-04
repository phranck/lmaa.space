import { db } from "../db/index.js";
import { formSubmissions } from "../db/schema.js";

/**
 * Inserts a new form submission record and returns its generated id.
 *
 * @param formConfigId - ID of the parent form config.
 * @param data         - Arbitrary field key/value pairs from the submission.
 * @returns The id of the created row.
 */
export async function insertFormSubmission(
  formConfigId: number,
  data: Record<string, unknown>,
): Promise<number> {
  const [row] = await db
    .insert(formSubmissions)
    .values({ formConfigId, data })
    .returning({ id: formSubmissions.id });
  return row.id;
}
