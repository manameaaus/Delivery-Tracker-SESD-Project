import { z } from "zod";
import { deliveryStatuses } from "../../domain/enums/DeliveryStatus.js";

export const deliveryFiltersSchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
  runners: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value.filter(Boolean);
      }
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }),
  statuses: z
    .union([z.string(), z.array(z.enum(deliveryStatuses))])
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value;
      }
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item): item is (typeof deliveryStatuses)[number] => deliveryStatuses.includes(item as (typeof deliveryStatuses)[number]));
    })
});

export const createDeliverySchema = z.object({
  deliveryTo: z.string().min(2).max(120),
  startLocation: z.string().min(2).max(120),
  destination: z.string().min(2).max(160),
  purpose: z.string().min(2).max(240),
  remarks: z.string().max(500).optional(),
  distance: z.coerce.number().nonnegative().max(5000).optional()
});

export const updateDeliverySchema = createDeliverySchema;

export const markDeliveredSchema = z.object({
  recipientSignature: z.string().max(500).optional(),
  distance: z.coerce.number().nonnegative().max(5000).optional()
});

export const rejectDeliverySchema = z.object({
  reason: z.string().max(500).optional()
});

export type DeliveryFilters = z.infer<typeof deliveryFiltersSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>;
export type RejectDeliveryInput = z.infer<typeof rejectDeliverySchema>;

