export type SandboxStatus="PREPARING"|"READY"|"ACTIVE"|"VALIDATING"|"COMPLETED"|"EXPIRED";
export interface SandboxService{prepare(sessionId:string):Promise<{baselinePassed:boolean;injectionVerified:boolean}>;readFile(sessionId:string,path:string):Promise<string>;writeFile(sessionId:string,path:string,content:string):Promise<void>;runCommand(sessionId:string,commandId:string):Promise<{exitCode:number;output:string}>;destroy(sessionId:string):Promise<void>}

const allowed:Record<SandboxStatus,SandboxStatus[]>={PREPARING:["READY","EXPIRED"],READY:["ACTIVE","EXPIRED"],ACTIVE:["VALIDATING","EXPIRED"],VALIDATING:["COMPLETED","ACTIVE","EXPIRED"],COMPLETED:[],EXPIRED:[]};
export function transitionStatus(current:SandboxStatus,next:SandboxStatus):SandboxStatus{if(!allowed[current].includes(next))throw new Error(`Invalid session transition: ${current} → ${next}`);return next;}
