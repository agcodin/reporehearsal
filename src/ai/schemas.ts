import { z } from "zod";
export const architectureSummarySchema=z.object({summary:z.string().min(20),services:z.array(z.object({name:z.string(),evidencePaths:z.array(z.string())})),risks:z.array(z.object({label:z.string(),reason:z.string(),evidencePaths:z.array(z.string())}))});
export const evaluationSchema=z.object({rootCauseUnderstanding:z.number().min(0).max(25),evidenceUse:z.array(z.string()),repairAssessment:z.string(),prevention:z.array(z.string())});
