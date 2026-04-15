export const deliveryStatuses = ["Unassigned", "Assigned", "In Progress", "Delivered", "Completed", "Rejected"] as const;

export type DeliveryStatus = (typeof deliveryStatuses)[number];

