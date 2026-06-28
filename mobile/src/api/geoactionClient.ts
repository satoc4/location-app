import type {
  ActionEventResult,
  ActionRun,
  Coordinate,
  Place,
  PlanCandidate,
  Reward,
  VerificationEventPayload
} from "../domain/types";

const defaultBaseUrl = "http://127.0.0.1:8000";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl,
  apiKey: process.env.EXPO_PUBLIC_API_KEY || "",
  userId: process.env.EXPO_PUBLIC_DEMO_USER_ID || "user_001"
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, apiConfig.baseUrl.replace(/\/$/, ""));
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (apiConfig.apiKey) {
    headers["X-API-Key"] = apiConfig.apiKey;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export const geoactionClient = {
  health() {
    return request<{ status: string; service: string }>("/health");
  },

  listPlanCandidates(origin?: Coordinate) {
    return request<PlanCandidate[]>("/api/plan-candidates", {
      query: {
        lat: origin?.lat,
        lng: origin?.lng,
        limit: 20
      }
    });
  },

  listPlaces() {
    return request<Place[]>("/api/places");
  },

  startAction(planId: string, userId = apiConfig.userId) {
    return request<ActionRun>("/api/actions/start", {
      method: "POST",
      body: { planId, userId }
    });
  },

  getActionRun(actionRunId: string) {
    return request<ActionRun>(`/api/actions/${actionRunId}`);
  },

  sendActionEvent(actionRunId: string, payload: VerificationEventPayload) {
    return request<ActionEventResult>(`/api/actions/${actionRunId}/events`, {
      method: "POST",
      body: payload
    });
  },

  listRewards(userId = apiConfig.userId) {
    return request<Reward[]>("/api/rewards", {
      query: { userId }
    });
  }
};
