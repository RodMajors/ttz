import { Controller, Get } from "@nestjs/common";

@Controller("activities")
export class ActivitiesController {
  @Get()
  list() {
    return { items: [], pagination: { page: 1, pageSize: 20, total: 0 } };
  }
}
