export type ApiOptions = RequestInit & {
  token?: string | null;
};

let apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
if (!apiBaseUrl.endsWith("/api")) {
  apiBaseUrl += "/api";
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body == null) {
    headers.delete("Content-Type");
  } else if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(errorBody.message ?? "Request failed");
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return (response.blob() as unknown) as Promise<T>;
}
