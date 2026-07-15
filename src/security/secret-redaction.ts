export function redactSecrets(value:string):string{return value
  .replace(/(OPENAI_API_KEY|DATABASE_URL|SESSION_SECRET)=([^\s]+)/gi,"$1=[REDACTED]")
  .replace(/Bearer\s+[A-Za-z0-9._-]+/gi,"[REDACTED]")
  .replace(/postgres(?:ql)?:\/\/[^\s]+/gi,"[REDACTED]");}
