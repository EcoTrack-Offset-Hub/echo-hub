export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string>;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(message: string, status: number = 500, details?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Base API client for EcoTrack Hub.
 * Dispatches requests to external backend (if NEXT_PUBLIC_API_BASE_URL is set)
 * or local Next.js Route Handlers (/api/...).
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  useLocalRoute = false
): Promise<T> {
  // Normalize base URL: if external API configured, prefix endpoint; otherwise use relative /api
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url: string;
  if (useLocalRoute) {
    url = cleanEndpoint;
  } else if (baseUrl) {
    if (baseUrl.endsWith("/api") || baseUrl.endsWith("/api/v1")) {
      url = `${baseUrl}${cleanEndpoint.replace(/^\/api(\/v1)?/, "")}`;
    } else {
      url = `${baseUrl}${cleanEndpoint}`;
    }
  } else {
    url = cleanEndpoint;
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("ecotrack_auth_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let jsonResponse: ApiResponse<T> | T | null = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      jsonResponse = await response.json();
    }

    if (!response.ok) {
      let errorMsg =
        (jsonResponse && typeof jsonResponse === "object" && "error" in jsonResponse && jsonResponse.error) ||
        (jsonResponse && typeof jsonResponse === "object" && "message" in jsonResponse && (jsonResponse as { message?: string }).message);

      if (!errorMsg) {
        if (response.status === 400) {
          errorMsg = "Please check the entered data.";
        } else if (response.status === 401 || response.status === 403) {
          errorMsg = "Unauthorized: Access denied.";
        } else if (response.status === 404) {
          errorMsg = "Requested resource not found.";
        } else if (response.status >= 500) {
          errorMsg = "Unable to save emissions data. Please try again.";
        } else {
          errorMsg = `Request failed with status ${response.status}`;
        }
      }

      const details =
        jsonResponse && typeof jsonResponse === "object" && "details" in jsonResponse
          ? (jsonResponse.details as Record<string, string>)
          : undefined;

      throw new ApiError(String(errorMsg), response.status, details);
    }

    // If response wrapped in standard ApiResponse envelope, unpack data
    if (jsonResponse && typeof jsonResponse === "object" && "success" in jsonResponse) {
      const envelope = jsonResponse as ApiResponse<T>;
      if (!envelope.success) {
        throw new ApiError(envelope.error || "Operation was unsuccessful", response.status, envelope.details);
      }
      return (envelope.data !== undefined ? envelope.data : envelope) as T;
    }

    return jsonResponse as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = "Unable to connect to the EcoTrack backend.";
    throw new ApiError(message, 0);
  }
}
