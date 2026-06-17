/**
 * E2E Test Setup
 *
 * This file configures the test environment for end-to-end tests.
 * It assumes the backend is running on the configured BACKEND_URL.
 *
 * Before running E2E tests, ensure:
 * 1. Backend is running (typically on http://localhost:8000)
 * 2. Database is populated with test data or fresh migrations
 * 3. Environment variables are set correctly
 */

import { transformKeysToCamelCase, transformKeysToSnakeCase } from "@/utils/stringUtils";

export const BACKEND_URL = "http://localhost:8000";
export const API_BASE = `${BACKEND_URL}/api`;

// Test user credentials - should be created in your test database
export const TEST_USER = {
  email: "test@test.com",
  password: "TestPassword123!",
  firstName: "Test",
  lastName: "User",
  emailHost: "GMAIL",
};

export const TEST_USER_2 = {
  email: "test2@test.com",
  password: "TestPassword123!",
  firstName: "Test",
  lastName: "User2",
  emailHost: "GMAIL",
};

// Store cookies and CSRF token between requests
let globalCookies: string[] = [];
let csrfToken = "";

// Helper to wait for backend to be ready
export const waitForBackend = async (maxAttempts = 30, delayMs = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profiles/me`, {
        method: "GET",
        headers: {
          Cookie: globalCookies.join("; "),
        },
      });
      // 401 is ok - means backend is responding but not authenticated
      if (response.ok || response.status === 401 || response.status === 403) {
        return true;
      }
    } catch {
      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error(`Backend not available at ${BACKEND_URL} after ${maxAttempts * delayMs}ms`);
};

// Helper to extract and store cookies from response
const handleCookies = (response: Response) => {
  // Get all Set-Cookie headers - use getSetCookie() for Node.js 18.17+
  let setCookieHeaders: string[] = [];

  // Try the modern getSetCookie() method first (Node.js 18.17+)
  if (typeof response.headers.getSetCookie === "function") {
    setCookieHeaders = response.headers.getSetCookie();
  } else {
    // Fallback for older Node.js versions
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      setCookieHeaders = [setCookieHeader];
    }
  }

  setCookieHeaders.forEach((cookieStr) => {
    // Extract session id from Set-Cookie header
    const sessionMatch = cookieStr.match(/sessionid=([^;]+)/);
    if (sessionMatch) {
      // Remove existing sessionid if present, then add new one
      globalCookies = globalCookies.filter((c) => !c.startsWith("sessionid="));
      globalCookies.push(`sessionid=${sessionMatch[1]}`);
    }

    // Extract CSRF token from Set-Cookie header
    const csrfMatch = cookieStr.match(/csrftoken=([^;]+)/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
      // Remove existing csrftoken if present, then add new one
      globalCookies = globalCookies.filter((c) => !c.startsWith("csrftoken="));
      globalCookies.push(`csrftoken=${csrfMatch[1]}`);
    }
  });
};

// Helper to login and get session cookie
export const loginTestUser = async (credentials = TEST_USER) => {

  // First, make a GET request to establish CSRF cookie (Django requirement)
  const getResponse = await fetch(`${API_BASE}/profiles/me`, {
    method: "GET",
    headers: {
      Cookie: globalCookies.join("; "),
    },
  });

  // Extract CSRF cookie from initial request
  handleCookies(getResponse);

  // Now login with the CSRF cookie
  const response = await fetch(`${API_BASE}/profiles/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: globalCookies.join("; "),
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(
      transformKeysToSnakeCase({
        email: credentials.email,
        password: credentials.password,
      }),
    ),
  });

  // Store cookies from login response
  handleCookies(response);

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Login failed with status ${response.status}:`, errorData);
    throw new Error(`Login failed: ${response.statusText} - ${errorData}`);
  }

  const data = await response.json();
  const converted = transformKeysToCamelCase(data);
  return converted;
};

// Helper to logout
export const logoutTestUser = async () => {
  await fetch(`${API_BASE}/profiles/logout/`, {
    method: "POST",
    headers: {
      Cookie: globalCookies.join("; "),
      "X-CSRFToken": csrfToken,
    },
  });

  globalCookies = [];
  csrfToken = "";
};

// Wrapper Response class that auto-converts snake_case to camelCase
class SerializingResponse extends Response {
  async json() {
    const data = await super.json();
    return transformKeysToCamelCase(data);
  }
}

// Helper to convert FormData fields to snake_case
const convertFormDataToSnakeCase = (formData: FormData): FormData => {
  const newFormData = new FormData();
  formData.forEach((value, key) => {
    // Simple camelCase to snake_case conversion for FormData keys
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    newFormData.append(snakeKey, value);
  });
  return newFormData;
};

// Helper to make authenticated requests with auto serialization
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});

  if (options.headers) {
  }

  // Add cookies for authentication
  headers.set("Cookie", globalCookies.join("; "));

  // Add CSRF token for state-changing requests
  if (csrfToken && options.method && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method)) {
    headers.set("X-CSRFToken", csrfToken);
  }

  // Convert camelCase body to snake_case for backend
  let body: BodyInit | null | undefined = options.body;

  if (body instanceof FormData) {
    // Convert FormData field names to snake_case
    body = convertFormDataToSnakeCase(body);
  } else if (
    body &&
    typeof body === "string" &&
    headers.get("Content-Type")?.includes("application/json")
  ) {
    // Convert JSON body
    try {
      const parsed = JSON.parse(body);
      const converted = transformKeysToSnakeCase(parsed);
      body = JSON.stringify(converted);
    } catch {
      // If not JSON, leave as is
    }
  }

  const response = await fetch(url, {
    ...options,
    body,
    headers,
  });

  // Log errors for debugging
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const errorData = await response.clone().json();
        console.warn(`⚠ API Error (${response.status}):`, errorData);
      } catch {
        const text = await response.clone().text();
        console.warn(`⚠ API Error (${response.status}):`, text);
      }
    }
  }

  // Wrap response to auto-convert JSON
  return new SerializingResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }) as unknown as Response;
};

// Track created IDs for cleanup
const createdEntities: { type: string; id: number }[] = [];

// Helper to track created entities
export const trackEntity = (type: string, id: number) => {
  createdEntities.push({ type, id });
};

// Delete single entity
const deleteEntity = async (endpoint: string, id: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${API_BASE}${endpoint}/${id}/`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Cleanup test data after tests
export const cleanupTestData = async () => {
  if (createdEntities.length === 0) {
    return;
  }


  // Delete in reverse order (LIFO - Last In First Out)
  for (let i = createdEntities.length - 1; i >= 0; i--) {
    const { type, id } = createdEntities[i];

    let endpoint = "";
    switch (type) {
      case "application":
        endpoint = "/applications";
        break;
      case "performance":
        endpoint = "/performances";
        break;
      case "festival":
        endpoint = "/festivals";
        break;
      default:
        continue;
    }

    const success = await deleteEntity(endpoint, id);
    if (success) {
    } else {
      console.warn(`  ✗ Failed to delete ${type} #${id}`);
    }
  }

  createdEntities.length = 0;
};

// Get current cookies for debugging
export const getCookies = () => globalCookies;
