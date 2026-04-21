import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken && redisUrl.startsWith("https")) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
  });
}

// Helper function to check rate limit
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) {
    // If Redis is not configured, allow request (fail open)
    console.warn("Rate limit check skipped: Redis not configured");
    return true;
  }
  try {
    const { success } = await ratelimit.limit(identifier);
    return success;
  } catch (error) {
    // If Redis fails, allow request (fail open)
    console.warn("Rate limit check failed:", error);
    return true;
  }
}