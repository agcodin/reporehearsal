import type { IncidentTemplate,RepositoryMap } from "../types";
export function isCompatible(template:IncidentTemplate,map:RepositoryMap):boolean{if(template.category==="database")return map.language==="TypeScript"&&map.database==="PostgreSQL"&&map.orm==="Prisma";return map.language==="TypeScript";}
