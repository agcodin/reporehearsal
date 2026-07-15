import { describe,expect,it } from "vitest"; import { profiles } from "../src/app";
describe("billing baseline",()=>{it("has a valid region for every seeded account",()=>expect(profiles.every(p=>p.billingRegion.length>0)).toBe(true));it("contains healthy legacy and new accounts",()=>expect(profiles).toHaveLength(4))});
