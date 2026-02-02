const { z } = require("zod");

const CriteriaSchema = z.object({
  destination: z.string().min(1),
  from: z.string().nullable(),
  to: z.string().nullable(),
  days: z.number().int().positive().nullable(),
  budget_eur: z.number().nonnegative().nullable(),
  interests: z.array(z.string().min(1)).default([]),
  type: z.string().nullable(),
  language: z.enum(["sr", "en"]),
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
  sources: z.array(SourceSchema).default([]),
  follow_up_questions: z.array(z.string().min(1)).default([]),
});

module.exports = { TravelPlanV1Schema };