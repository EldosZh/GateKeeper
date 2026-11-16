import { z } from "zod";
export const targetSchema = z.object({ id: z.string(), url: z.string().url(), weight: z.number().int().positive().default(1), enabled: z.boolean().default(true) });
export const routeSchema = z.object({ id: z.string(), name: z.string(), path: z.string().startsWith("/"), match: z.enum(["prefix", "exact"]).default("prefix"), methods: z.array(z.string()).default(["GET"]), hosts: z.array(z.string()).default([]), upstream: z.string().url(), rewrite: z.string().optional(), enabled: z.boolean().default(true), priority: z.number().int().default(0), timeoutMs: z.number().int().positive().max(120000).default(10000), maxBodyBytes: z.number().int().positive().max(104857600).default(10485760), apiKeyRequired: z.boolean().default(false), limit: z.number().int().positive().optional(), windowSeconds: z.number().int().positive().default(60) });
export type Route = z.infer<typeof routeSchema>;
export function matchesRoute(route: Route, method: string, pathname: string, host?: string) {
  return route.enabled && route.methods.some(m => m.toUpperCase() === method.toUpperCase()) && (!route.hosts.length || route.hosts.includes(host ?? "")) && (route.match === "exact" ? pathname === route.path : pathname === route.path || pathname.startsWith(route.path.endsWith("/") ? route.path : `${route.path}/`));
}
export function selectRoute(routes: Route[], method: string, pathname: string, host?: string) {
  return routes.filter(r => matchesRoute(r, method, pathname, host)).sort((a,b) => b.priority-a.priority || b.path.length-a.path.length || a.id.localeCompare(b.id))[0];
}
export function chooseWeighted<T extends {weight:number}>(items:T[], value:number) {
  const total=items.reduce((n,x)=>n+x.weight,0); if(!total) return undefined;
  let slot=Math.abs(value)%total; for(const item of items){if(slot<item.weight)return item;slot-=item.weight;} return items[items.length-1];
}
