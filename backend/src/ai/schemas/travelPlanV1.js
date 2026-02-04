const { z } = require("zod");

const CriteriaSchema = z.object({
  destination: z.string().min(1).catch(""),
  from: z.string().nullable().catch(null),
  to: z.string().nullable().catch(null),
  days: z.number().int().positive().nullable().catch(null),
  budget_eur: z.number().nonnegative().nullable().catch(null),
  interests: z.array(z.string().min(1)).catch([]),
  type: z.string().nullable().catch(null),
  language: z.enum(["sr", "en"]).catch("sr"),
});

const PlanDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  activities: z.array(z.string().min(1)).min(1),
});

const SourceSchema = z.object({
  title: z.string().min(1),
  link: z.string().url(),
});

const TravelPlanV1Schema = z.object({
  criteria: CriteriaSchema,
  plan: z.array(PlanDaySchema).min(1),
  sources: z.array(SourceSchema).catch([]),
  follow_up_questions: z.array(z.string().min(1)).catch([]),
});

module.exports = { travelPlanV1Schema: TravelPlanV1Schema, TravelPlanV1Schema };
