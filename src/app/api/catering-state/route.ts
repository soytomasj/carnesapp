export const dynamic = "force-dynamic";

const DEFAULT_TABLE = "catering_app_state";
const DEFAULT_ROW_ID = "default";

type SupabaseConfig = {
  key: string;
  rowId: string;
  table: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    key,
    rowId: process.env.SUPABASE_CATERING_STATE_ID ?? DEFAULT_ROW_ID,
    table: process.env.SUPABASE_CATERING_STATE_TABLE ?? DEFAULT_TABLE,
    url,
  };
}

function buildHeaders(config: SupabaseConfig): HeadersInit {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
  };
}

function buildTableUrl(config: SupabaseConfig): string {
  return `${config.url}/rest/v1/${encodeURIComponent(config.table)}`;
}

export async function GET() {
  const config = getSupabaseConfig();

  if (!config) {
    return Response.json(
      { error: "Supabase env vars are not configured.", state: null },
      { status: 503 },
    );
  }

  const response = await fetch(
    `${buildTableUrl(config)}?id=eq.${encodeURIComponent(
      config.rowId,
    )}&select=state&limit=1`,
    {
      cache: "no-store",
      headers: buildHeaders(config),
    },
  );

  if (!response.ok) {
    return Response.json(
      { error: "Could not read Supabase state.", state: null },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as Array<{ state?: unknown }>;

  return Response.json({ state: rows[0]?.state ?? null });
}

export async function PUT(request: Request) {
  const config = getSupabaseConfig();

  if (!config) {
    return Response.json(
      { error: "Supabase env vars are not configured." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isRecord(payload) || !isRecord(payload.state)) {
    return Response.json({ error: "Invalid catering state." }, { status: 400 });
  }

  const response = await fetch(
    `${buildTableUrl(config)}?on_conflict=id`,
    {
      body: JSON.stringify({
        id: config.rowId,
        state: payload.state,
        updated_at: new Date().toISOString(),
      }),
      headers: {
        ...buildHeaders(config),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    return Response.json(
      { error: "Could not save Supabase state." },
      { status: response.status },
    );
  }

  return Response.json({ ok: true });
}
