import type { IDeliveryRepository } from "../../application/interfaces/IRepositories.js";
import type { DeliveryFilters } from "../../application/dto/DeliveryDto.js";
import { Delivery } from "../../domain/entities/Delivery.js";
import { AppError } from "../../domain/errors/AppError.js";
import { supabaseAdminClient } from "../supabase/client.js";

type DeliveryRow = Record<string, unknown>;

export class SupabaseDeliveryRepository implements IDeliveryRepository {
  async list(filters: DeliveryFilters): Promise<Delivery[]> {
    let query = supabaseAdminClient.from("deliveries").select("*").order("created_at", { ascending: false });

    if (filters.statuses.length > 0) {
      query = query.in("status", filters.statuses);
    }
    if (filters.runners.length > 0) {
      query = query.in("runner_id", filters.runners);
    }
    if (filters.months) {
      const threshold = new Date();
      threshold.setMonth(threshold.getMonth() - filters.months);
      query = query.gte("created_at", threshold.toISOString());
    }

    const result = await query;
    if (result.error) {
      throw new AppError(result.error.message, 500);
    }

    return result.data.map((row) => Delivery.fromPersistence(row as DeliveryRow));
  }

  async findById(id: string): Promise<Delivery | null> {
    const result = await supabaseAdminClient.from("deliveries").select("*").eq("id", id).maybeSingle();
    if (result.error) {
      throw new AppError(result.error.message, 500);
    }
    return result.data ? Delivery.fromPersistence(result.data as DeliveryRow) : null;
  }

  async create(delivery: Delivery): Promise<Delivery> {
    const result = await supabaseAdminClient.from("deliveries").insert(delivery.toPersistence()).select("*").single();
    if (result.error) {
      throw new AppError(result.error.message, 500);
    }
    return Delivery.fromPersistence(result.data as DeliveryRow);
  }

  async update(delivery: Delivery): Promise<Delivery> {
    const result = await supabaseAdminClient
      .from("deliveries")
      .update(delivery.toPersistence())
      .eq("id", delivery.id)
      .select("*")
      .single();

    if (result.error) {
      throw new AppError(result.error.message, 500);
    }
    return Delivery.fromPersistence(result.data as DeliveryRow);
  }

  async getDashboardMetrics(filters: DeliveryFilters) {
    const deliveries = await this.list(filters);
    const byStatus = deliveries.reduce<Record<string, number>>((acc, delivery) => {
      const json = delivery.toJSON();
      const status = String(json.status);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const byRunner = deliveries.reduce<Record<string, { count: number; distance: number }>>((acc, delivery) => {
      const json = delivery.toJSON();
      const runnerId = json.runnerId as string | null;
      if (runnerId) {
        if (!acc[runnerId]) {
          acc[runnerId] = { count: 0, distance: 0 };
        }
        acc[runnerId].count += 1;
        if (json.distance) {
          acc[runnerId].distance += Number(json.distance);
        }
      }
      return acc;
    }, {});

    return {
      total: deliveries.length,
      byStatus,
      byRunner
    };
  }
}

