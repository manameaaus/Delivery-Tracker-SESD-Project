import type { NextFunction, Request, Response } from "express";
import { createDeliverySchema, deliveryFiltersSchema, markDeliveredSchema, rejectDeliverySchema, updateDeliverySchema } from "../../application/dto/DeliveryDto.js";
import type { DeliveryService } from "../../application/services/DeliveryService.js";
import * as XLSX from "xlsx";

export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  list = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const filters = deliveryFiltersSchema.parse(request.query);
      const deliveries = await this.deliveryService.list(filters);
      response.json(deliveries.map((delivery) => delivery.toJSON()));
    } catch (error) {
      next(error);
    }
  };

  dashboard = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const filters = deliveryFiltersSchema.parse(request.query);
      response.json(await this.deliveryService.getDashboard(filters));
    } catch (error) {
      next(error);
    }
  };

  create = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = createDeliverySchema.parse(request.body);
      const delivery = await this.deliveryService.create(request.actor!, input);
      response.status(201).json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = updateDeliverySchema.parse(request.body);
      const delivery = await this.deliveryService.update(request.actor!, this.getRouteId(request), input);
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  claim = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const delivery = await this.deliveryService.claim(request.actor!, this.getRouteId(request));
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  start = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const delivery = await this.deliveryService.start(request.actor!, this.getRouteId(request));
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  markDelivered = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = markDeliveredSchema.parse(request.body ?? {});
      const delivery = await this.deliveryService.markDelivered(request.actor!, this.getRouteId(request), input);
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  approve = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const delivery = await this.deliveryService.approve(request.actor!, this.getRouteId(request));
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  reject = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = rejectDeliverySchema.parse(request.body ?? {});
      const delivery = await this.deliveryService.reject(request.actor!, this.getRouteId(request), input);
      response.json(delivery.toJSON());
    } catch (error) {
      next(error);
    }
  };

  export = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const filters = deliveryFiltersSchema.parse(request.query);
      const deliveries = await this.deliveryService.list(filters);
      const rows = deliveries.map((delivery) => delivery.toJSON());
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Deliveries");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.setHeader("Content-Disposition", 'attachment; filename="deliveries.xlsx"');
      response.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  private getRouteId(request: Request) {
    return Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  }
}
