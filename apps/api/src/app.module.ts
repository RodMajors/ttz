import { Module } from "@nestjs/common";
import { ActivitiesController } from "./activities.controller";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController, ActivitiesController],
})
export class AppModule {}
