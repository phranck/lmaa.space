/**
 * Advisory-lock namespace that serializes every canonical shop-slug allocation.
 *
 * Repository writes use the transaction-scoped form. Migration reconciliation
 * acquires the same lock so old application containers cannot allocate against
 * a partially repaired slug set during a deployment.
 */
export const SHOP_SLUG_ALLOCATION_LOCK = 46_102_027;
