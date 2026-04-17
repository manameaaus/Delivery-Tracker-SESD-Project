import { randomUUID } from "node:crypto";
import type { CreateDeliveryInput, DeliveryFilters, MarkDeliveredInput, RejectDeliveryInput, UpdateDeliveryInput } from "../dto/DeliveryDto.js";
import type { IDeliveryRepository } from "../interfaces/IRepositories.js";
import type { Profile } from "../../domain/entities/Profile.js";
import { AppError } from "../../domain/errors/AppError.js";
import { Delivery } from "../../domain/entities/Delivery.js";

export class DeliveryService {
  constructor(private readonly deliveryRepository: IDeliveryRepository) {}

  async list(filters: DeliveryFilters) {
    return this.deliveryRepository.list(filters);
  }

  async getDashboard(filters: DeliveryFilters) {
    return this.deliveryRepository.getDashboardMetrics(filters);
  }

  async create(actor: Profile, input: CreateDeliveryInput) {
    this.ensureCreator(actor);

    const now = new Date().toISOString();
    const delivery = new Delivery({
      id: randomUUID(),
      deliveryTo: input.deliveryTo,
      startLocation: input.startLocation,
      destination: input.destination,
      purpose: input.purpose,
      remarks: input.remarks ?? null,
      status: "Unassigned",
      runnerId: null,
      startDateTime: null,
      destinationDateTime: null,
      distance: input.distance ?? null,
      approvedBy: null,
      approvedByUserId: null,
      approvedAt: null,
      recipientSignature: null,
      createdAt: now,
      updatedAt: now
    });

    return this.deliveryRepository.create(delivery);
  }

  async update(actor: Profile, deliveryId: string, input: UpdateDeliveryInput) {
    this.ensureCreator(actor);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.updateDetails(input);
    return this.deliveryRepository.update(delivery);
  }

  async claim(actor: Profile, deliveryId: string) {
    this.ensureRole(actor, ["runner", "admin"]);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.claim(actor);
    return this.deliveryRepository.update(delivery);
  }

  async start(actor: Profile, deliveryId: string) {
    this.ensureRole(actor, ["runner", "admin"]);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.start(actor);
    return this.deliveryRepository.update(delivery);
  }

  async markDelivered(actor: Profile, deliveryId: string, input: MarkDeliveredInput) {
    this.ensureRole(actor, ["runner", "admin"]);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.markDelivered(actor, input.recipientSignature, input.distance);
    return this.deliveryRepository.update(delivery);
  }

  async reject(actor: Profile, deliveryId: string, input: RejectDeliveryInput) {
    this.ensureRole(actor, ["approver", "admin"]);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.reject(actor, input.reason);
    return this.deliveryRepository.update(delivery);
  }

  async approve(actor: Profile, deliveryId: string) {
    this.ensureRole(actor, ["approver", "admin"]);
    const delivery = await this.requireDelivery(deliveryId);
    delivery.approve(actor);
    return this.deliveryRepository.update(delivery);
  }

  private async requireDelivery(id: string) {
    const delivery = await this.deliveryRepository.findById(id);
    if (!delivery) {
      throw new AppError("Delivery not found", 404);
    }
    return delivery;
  }

  private ensureCreator(actor: Profile) {
    this.ensureRole(actor, ["delivery_creator", "admin"]);
  }

  private ensureRole(actor: Profile, roles: Array<"delivery_creator" | "runner" | "approver" | "admin">) {
    if (!actor.hasAnyRole(roles)) {
      throw new AppError("You do not have permission for this action", 403);
    }
  }
}

