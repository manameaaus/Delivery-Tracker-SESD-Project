import { AppError } from "../errors/AppError.js";
import type { Profile } from "./Profile.js";
import type { DeliveryStatus } from "../enums/DeliveryStatus.js";

export class Delivery {
  readonly id: string;
  private deliveryTo: string;
  private startLocation: string;
  private destination: string;
  private purpose: string;
  private remarks: string | null;
  private status: DeliveryStatus;
  private runnerId: string | null;
  private startDateTime: string | null;
  private destinationDateTime: string | null;
  private distance: number | null;
  private approvedBy: string | null;
  private approvedByUserId: string | null;
  private approvedAt: string | null;
  private recipientSignature: string | null;
  readonly createdAt: string;
  private updatedAt: string;

  constructor(params: {
    id: string;
    deliveryTo: string;
    startLocation: string;
    destination: string;
    purpose: string;
    remarks: string | null;
    status: DeliveryStatus;
    runnerId: string | null;
    startDateTime: string | null;
    destinationDateTime: string | null;
    distance: number | null;
    approvedBy: string | null;
    approvedByUserId: string | null;
    approvedAt: string | null;
    recipientSignature: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = params.id;
    this.deliveryTo = params.deliveryTo;
    this.startLocation = params.startLocation;
    this.destination = params.destination;
    this.purpose = params.purpose;
    this.remarks = params.remarks;
    this.status = params.status;
    this.runnerId = params.runnerId;
    this.startDateTime = params.startDateTime;
    this.destinationDateTime = params.destinationDateTime;
    this.distance = params.distance;
    this.approvedBy = params.approvedBy;
    this.approvedByUserId = params.approvedByUserId;
    this.approvedAt = params.approvedAt;
    this.recipientSignature = params.recipientSignature;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  updateDetails(input: {
    deliveryTo: string;
    startLocation: string;
    destination: string;
    purpose: string;
    remarks?: string | null;
    distance?: number | null;
  }): void {
    if (this.status !== "Unassigned") {
      throw new AppError("Only unassigned deliveries can be edited", 409);
    }

    this.deliveryTo = input.deliveryTo;
    this.startLocation = input.startLocation;
    this.destination = input.destination;
    this.purpose = input.purpose;
    this.remarks = input.remarks ?? null;
    this.distance = input.distance ?? null;
    this.touch();
  }

  claim(runner: Profile): void {
    if (this.status !== "Unassigned") {
      throw new AppError("Delivery is not available for claim", 409);
    }

    this.runnerId = runner.id;
    this.status = "Assigned";
    this.touch();
  }

  start(runner: Profile): void {
    if (this.runnerId !== runner.id) {
      throw new AppError("Only the assigned runner can start this delivery", 403);
    }
    if (this.status !== "Assigned") {
      throw new AppError("Only assigned deliveries can be started", 409);
    }

    this.status = "In Progress";
    this.startDateTime = new Date().toISOString();
    this.touch();
  }

  markDelivered(runner: Profile, signature?: string | null, distance?: number | null): void {
    if (this.runnerId !== runner.id) {
      throw new AppError("Only the assigned runner can complete this delivery", 403);
    }
    if (this.status !== "In Progress") {
      throw new AppError("Only deliveries in progress can be marked delivered", 409);
    }

    this.status = "Delivered";
    this.destinationDateTime = new Date().toISOString();
    this.recipientSignature = signature ?? null;
    if (distance !== undefined && distance !== null) {
      this.distance = distance;
    }
    this.touch();
  }

  reject(approver: Profile, reason?: string | null): void {
    if (this.status !== "Delivered") {
      throw new AppError("Only delivered jobs can be rejected", 409);
    }

    this.status = "Rejected";
    this.approvedBy = approver.fullName;
    this.approvedByUserId = approver.id;
    this.approvedAt = new Date().toISOString();
    if (reason) {
      this.remarks = this.remarks ? `${this.remarks}\nRejection Reason: ${reason}` : `Rejection Reason: ${reason}`;
    }
    this.touch();
  }

  approve(approver: Profile): void {
    if (this.status !== "Delivered") {
      throw new AppError("Only delivered jobs can be approved", 409);
    }

    this.status = "Completed";
    this.approvedBy = approver.fullName;
    this.approvedByUserId = approver.id;
    this.approvedAt = new Date().toISOString();
    this.touch();
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      delivery_to: this.deliveryTo,
      start_location: this.startLocation,
      destination: this.destination,
      purpose: this.purpose,
      remarks: this.remarks,
      status: this.status,
      runner_id: this.runnerId,
      start_date_time: this.startDateTime,
      destination_date_time: this.destinationDateTime,
      distance: this.distance,
      approved_by: this.approvedBy,
      approved_by_user_id: this.approvedByUserId,
      approved_at: this.approvedAt,
      recipient_signature: this.recipientSignature,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      deliveryTo: this.deliveryTo,
      startLocation: this.startLocation,
      destination: this.destination,
      purpose: this.purpose,
      remarks: this.remarks,
      status: this.status,
      runnerId: this.runnerId,
      startDateTime: this.startDateTime,
      destinationDateTime: this.destinationDateTime,
      distance: this.distance,
      approvedBy: this.approvedBy,
      approvedByUserId: this.approvedByUserId,
      approvedAt: this.approvedAt,
      recipientSignature: this.recipientSignature,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromPersistence(row: Record<string, unknown>): Delivery {
    return new Delivery({
      id: String(row.id),
      deliveryTo: String(row.delivery_to),
      startLocation: String(row.start_location),
      destination: String(row.destination),
      purpose: String(row.purpose),
      remarks: row.remarks ? String(row.remarks) : null,
      status: row.status as DeliveryStatus,
      runnerId: row.runner_id ? String(row.runner_id) : null,
      startDateTime: row.start_date_time ? String(row.start_date_time) : null,
      destinationDateTime: row.destination_date_time ? String(row.destination_date_time) : null,
      distance: typeof row.distance === "number" ? row.distance : row.distance ? Number(row.distance) : null,
      approvedBy: row.approved_by ? String(row.approved_by) : null,
      approvedByUserId: row.approved_by_user_id ? String(row.approved_by_user_id) : null,
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      recipientSignature: row.recipient_signature ? String(row.recipient_signature) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    });
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }
}

