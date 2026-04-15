export const appRoles = ["delivery_creator", "runner", "approver", "admin"] as const;

export type AppRole = (typeof appRoles)[number];

export const elevatedRoles: AppRole[] = ["admin"];

