import Fastify from "fastify";
import Redis from "ioredis";
import { request } from "undici";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { selectRoute, routeSchema, type Route } from "@gatekeeper/shared";
import { createHash, timingSafeEqual } from "node:crypto";

const app=Fastify({logger:true,requestIdHeader:"x-request-id",bodyLimit:10*1024*1024});
const redis=new Redis(process.env.REDIS_URL ?? "redis://localhost:6379",{lazyConnect:true,maxRetriesPerRequest:1});
let routes:Route[]=[]; let configVersion=0;
const registry=new Registry(); collectDefaultMetrics({register:registry});
const requests=new Counter({name:"gatekeeper_requests_total",help:"Gateway requests",labelNames:["route","status"],registers:[registry]});
const latency=new Histogram({name:"gatekeeper_request_duration_seconds",help:"Gateway request latency",labelNames:["route"],registers:[registry]});
const limited=new Counter({name:"gatekeeper_rate_limited_total",help:"Requests rejected by rate limit",registers:[registry]});
const stripHop=(h:Record<string,unknown>)=>{const out:Record<string,string>=Object.create(null);const hop=new Set(["connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailer","transfer-encoding","upgrade","host"]);for(const[k,v]of Object.entries(h))if(!hop.has(k.toLowerCase())&&!k.toLowerCase().startsWith("x-forwarded-")&&typeof v==="string")out[k]=v;return out;};
function applyConfig(value:unknown,version:number){if(!Array.isArray(value))throw new Error("Config routes must be an array");const parsed=value.map(x=>routeSchema.parse(x));routes=parsed;configVersion=version;}
async function loadConfig(){try{const r=await fetch(`${process.env.CONTROL_PLANE_URL??"http://localhost:8081"}/internal/gateway-config`,{headers:{authorization:`Bearer ${process.env.INTERNAL_TOKEN??"local-development-token"}`},signal:AbortSignal.timeout(2500)});if(r.ok){const x=await r.json() as {version:number;routes:unknown[]};if(x.version>=configVersion)applyConfig(x.routes,x.version);}}catch(e){app.log.warn({err:e,configVersion},"config refresh failed; keeping active snapshot");}}
await loadConfig();setInterval(loadConfig,5000).unref();
app.get("/health",async()=>({ok:true,component:"gateway",configVersion}));app.get("/ready",async(_q,reply)=>{if(!configVersion)return reply.code(503).send({ready:false});return{ready:true,configVersion};});
app.get("/metrics",async(_q,reply)=>reply.type(registry.contentType).send(await registry.metrics()));
app.all("/*",async(req,reply)=>{
 const end=latency.startTimer();const u=new URL(req.url,"http://gateway.local");const route=selectRoute(routes,req.method,u.pathname,req.headers.host?.split(":")[0]);
 if(!route){requests.inc({route:"unmatched",status:"404"});end({route:"unmatched"});return reply.code(404).send({error:{code:"ROUTE_NOT_FOUND",message:"No route matched"}});}
 try{
  if(route.apiKeyRequired){const raw=req.headers["x-api-key"];if(typeof raw!=="string"){requests.inc({route:route.id,status:"401"});end({route:route.id});return reply.code(401).send({error:{code:"API_KEY_REQUIRED",message:"A valid API key is required"}});}const digest=createHash("sha256").update(raw).digest("hex");const cp=await fetch(`${process.env.CONTROL_PLANE_URL??"http://localhost:8081"}/internal/api-keys/verify`,{method:"POST",headers:{authorization:`Bearer ${process.env.INTERNAL_TOKEN??"local-development-token"}`,"content-type":"application/json"},body:JSON.stringify({digest}),signal:AbortSignal.timeout(2000)});if(!cp.ok){requests.inc({route:route.id,status:"401"});end({route:route.id});return reply.code(401).send({error:{code:"INVALID_API_KEY",message:"API key is invalid"}});}}
  if(route.limit){try{await redis.connect().catch(()=>{});const key=`rl:${route.id}:${typeof req.headers["x-api-key"]==="string"?createHash("sha256").update(req.headers["x-api-key"] as string).digest("hex"):req.ip}`;const count=await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",1,key,route.windowSeconds) as number;reply.header("x-ratelimit-limit",route.limit).header("x-ratelimit-remaining",Math.max(0,route.limit-count));if(count>route.limit){limited.inc();requests.inc({route:route.id,status:"429"});end({route:route.id});return reply.code(429).send({error:{code:"RATE_LIMITED",message:"Rate limit exceeded"}});}}catch(e){if(route.apiKeyRequired){req.log.error({err:e},"redis unavailable for protected route");return reply.code(503).send({error:{code:"RATE_LIMIT_UNAVAILABLE",message:"Rate limiting unavailable"}});}}}
  const base=new URL(route.upstream);const path=route.rewrite?route.rewrite+u.pathname.slice(route.path.length):u.pathname;const target=new URL(path+u.search,base);const headers=stripHop(req.headers as Record<string,unknown>);headers["x-forwarded-for"]=req.ip;headers["x-forwarded-host"]=req.headers.host??"";headers["x-forwarded-proto"]="http";headers["x-request-id"]=req.id;
  const body=["GET","HEAD"].includes(req.method)?undefined:JSON.stringify(req.body);
  const res=await request(target,{method:req.method,headers,body,headersTimeout:route.timeoutMs,bodyTimeout:route.timeoutMs,maxRedirections:0});
  reply.code(res.statusCode);for(const[k,v]of Object.entries(res.headers))if(v!==undefined&&!new Set(["connection","keep-alive","transfer-encoding","upgrade","content-length"]).has(k.toLowerCase()))reply.header(k,v as string);
  requests.inc({route:route.id,status:String(res.statusCode)});end({route:route.id});return reply.send(res.body);
 }catch(e){req.log.warn({err:e,route:route.id},"upstream request failed");requests.inc({route:route.id,status:"502"});end({route:route.id});return reply.code(502).send({error:{code:"UPSTREAM_ERROR",message:"Upstream request failed"}});}
});
await app.listen({port:Number(process.env.GATEWAY_PORT??8080),host:"0.0.0.0"});
