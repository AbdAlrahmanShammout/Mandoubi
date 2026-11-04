type IsOptionalRelation<T> = T extends Date ? false : T extends Buffer ? false : T extends object ? true : false;

/**
 * Makes loaded relations optional while scalars and dates stay required.
 */
export type OptionalRelations<T> = {
  [K in keyof T]: IsOptionalRelation<T[K]> extends true ? T[K] | undefined : T[K];
};
