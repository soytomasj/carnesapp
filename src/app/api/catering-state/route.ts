export const dynamic = "force-dynamic";

import { Redis } from "@upstash/redis";

const KV_KEY = "catering-app-state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRedis(): Redis | null {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

export async function GET() {
  const redis = getRedis();

  if (!redis) {
    return Response.json(
      { error: "Redis env vars are not configured.", state: null },
      { status: 503 },
    );
  }

  try {
    const state = await redis.get(KV_KEY);
    return Response.json({ state: state ?? null });
  } catch {
    return Response.json(
      { error: "Could not read state.", state: null },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const redis = getRedis();

  if (!redis) {
    return Response.json(
      { error: "Redis env vars are not configured." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isRecord(payload) || !isRecord(payload.state)) {
    return Response.json({ error: "Invalid catering state." }, { status: 400 });
  }

  try {
    await redis.set(KV_KEY, payload.state);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not save state." }, { status: 500 });
  }
}
