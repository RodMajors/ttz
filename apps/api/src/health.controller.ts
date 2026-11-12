import { Controller, Get } from "@nestjs/common";

import { healthResponseSchema } from "@ttz/contracts";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return healthResponseSchema.parse({
      status: "ok",
      service: "ttz-api",
      timestamp: new Date().toISOString(),
    });
  }
}
