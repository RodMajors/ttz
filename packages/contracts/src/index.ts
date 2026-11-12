import { z } from "zod";

export const privilegeSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Privilege = z.infer<typeof privilegeSchema>;

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "LATE",
  "EXCUSED_ABSENCE",
  "UNEXCUSED_ABSENCE",
  "BENCH",
  "NOT_SIGNED_UP",
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export const effectiveAttendanceStatuses = ["PRESENT", "LATE"] as const satisfies readonly AttendanceStatus[];

export const notificationPreferenceSchema = z.object({
  activityPublished: z.boolean(),
  signupResult: z.boolean(),
  beforeTeamUp: z.boolean(),
  activityCancelled: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const signupStatusSchema = z.enum(["PENDING", "CONFIRMED", "BENCH", "CANCELLED", "REJECTED"]);
export type SignupStatus = z.infer<typeof signupStatusSchema>;

export const activityTypeCodeSchema = z.enum([
  "raid_progress",
  "raid_farm",
  "mythic_plus_push",
  "mythic_plus_vault",
  "casual",
]);

export const activitySummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  type: activityTypeCodeSchema,
  beginAt: z.string().datetime(),
  teamUpAt: z.string().datetime(),
  maxPlayers: z.number().int().positive(),
  signupDeadline: z.string().datetime().nullable(),
  signupCount: z.number().int().nonnegative(),
  confirmedCount: z.number().int().nonnegative(),
});
export type ActivitySummary = z.infer<typeof activitySummarySchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("ttz-api"),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
