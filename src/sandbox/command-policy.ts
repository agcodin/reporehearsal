export const approvedCommands={"run-tests":["npm","test"],"run-lint":["npm","run","lint"],"run-build":["npm","run","build"],"migration-status":["npx","prisma","migrate","status"],"check-health":["internal","health-check"],"restart-service":["internal","restart","billing-api"]} as const;
export type CommandId=keyof typeof approvedCommands;
export function commandFor(id:string):readonly string[]{if(!(id in approvedCommands))throw new Error("Command is not approved");return approvedCommands[id as CommandId];}
