import { transformKeysToCamelCase, transformKeysToSnakeCase } from "@/utils/stringUtils";
import { formatErrorMessage } from "@/utils/stringUtils";
import { toast } from "sonner";

const getFullUrl = (url: string): string => {
  if (url.startsWith("http")) {
    return url;
  }

  // SSR: use internal Docker network URL (server-side only env var)
  // Browser: use relative URL (Next.js rewrites will proxy to backend)
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      : "";
  return `${baseUrl}${url}`;
};

const getServerCookies = async (): Promise<string> => {
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      return allCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    } catch {
      return "";
    }
  }
  return "";
};

const baseRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  const serverCookies = await getServerCookies();
  if (serverCookies) {
    headers["Cookie"] = serverCookies;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return fetch(getFullUrl(url), {
    ...options,
    credentials: "include",
    headers,
  });
};

const handleResponse = async <T>(
  res: Response,
  url: string,
  successMessage?: string,
): Promise<T> => {
  if (!res.ok) {
    const error = await res.text();

    const formattedError = formatErrorMessage(error);

    toast.error(formattedError, {
      closeButton: true,
      className: "border border-red-600",
      duration: 10000,
    });
    throw new Error(`Request failed for ${url}: ${res.status} - ${error}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (successMessage) {
    toast.success(successMessage, { className: "border border-primary" });
  }
  return transformKeysToCamelCase(json);
};

export const fetchRequest = async <T = unknown>(url: string, options?: RequestInit): Promise<T> => {
  const res = await baseRequest(url, options);
  return handleResponse<T>(res, url);
};

export const sendRequest = async <TReq, TRes>(
  url: string,
  data: TReq,
  method: "POST" | "PUT" | "PATCH" = "POST",
  toastMessage?: string,
): Promise<TRes> => {
  const res = await baseRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transformKeysToSnakeCase(data)),
  });
  return handleResponse<TRes>(res, url, toastMessage ?? "Success");
};

export const deleteRequest = async (url: string, toastMessage?: string): Promise<void> => {
  const res = await baseRequest(url, { method: "DELETE" });
  await handleResponse(res, url, toastMessage ?? "Successfully deleted");
};

export const sendFormDataRequest = async <TReq, TRes = TReq>(
  url: string,
  data?: TReq,
  files?: File[],
  fileFieldName?: string,
  method: "POST" | "PUT" | "PATCH" = "POST",
  toastMessage?: string,
): Promise<TRes> => {
  const formData = new FormData();

  if (data) {
    const jsonData = transformKeysToSnakeCase(data);
    Object.keys(jsonData).forEach((key) => {
      formData.append(key, jsonData[key]);
    });
  }

  if (files && fileFieldName) {
    files.forEach((file) => {
      formData.append(fileFieldName, file);
    });
  }

  const res = await baseRequest(url, { method, body: formData });
  return handleResponse<TRes>(res, url, toastMessage ?? "Success");
};

export const patchRequest = async <TRes>(url: string, toastMessage?: string): Promise<TRes> => {
  const res = await baseRequest(url, { method: "PATCH" });
  return handleResponse<TRes>(res, url, toastMessage);
};

const getCsrfToken = (): string | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
};
