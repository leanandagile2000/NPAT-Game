import { isIP } from "node:net";
import { z } from "zod";

const serverSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    GEONAMES_USERNAME: z.string().min(1),
    SESSION_SECRET: z.string().min(16),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    /** Optional: connect to this IP for GeoNames HTTPS while preserving SNI/Host for secure.geonames.org (bad DNS round-robin mitigation). */
    GEONAMES_RESOLVED_IP: z.string().optional(),
  })
  .transform((d) => ({
    ...d,
    GEONAMES_RESOLVED_IP: d.GEONAMES_RESOLVED_IP?.trim() ? d.GEONAMES_RESOLVED_IP.trim() : undefined,
  }))
  .superRefine((d, ctx) => {
    if (d.GEONAMES_RESOLVED_IP && isIP(d.GEONAMES_RESOLVED_IP) === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["GEONAMES_RESOLVED_IP"],
        message: "Must be a valid IPv4 or IPv6 address",
      });
    }
  });

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_NPAT_NAME_LIST_VERSION: z.string().optional(),
});

export function getServerEnv() {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEONAMES_USERNAME: process.env.GEONAMES_USERNAME,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GEONAMES_RESOLVED_IP: process.env.GEONAMES_RESOLVED_IP,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid environment variables. See .env.local.example: " +
        parsed.error.issues.map((e) => e.path.join(".") + " " + e.message).join("; "),
    );
  }
  return parsed.data;
}

export function getPublicSupabaseConfig() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_NPAT_NAME_LIST_VERSION: process.env.NEXT_PUBLIC_NPAT_NAME_LIST_VERSION,
  });
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

/** True if env is configured enough to run server actions. */
export function isServerEnvReady(): boolean {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEONAMES_USERNAME: process.env.GEONAMES_USERNAME,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GEONAMES_RESOLVED_IP: process.env.GEONAMES_RESOLVED_IP,
  });
  return parsed.success;
}
