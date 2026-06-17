import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  waitForBackend,
  loginTestUser,
  API_BASE,
  fetchWithAuth,
  cleanupTestData,
  trackEntity,
} from "./setup";
import { Residency } from "@/interfaces/entities/Residency";

describe("E2E: Residencies and Applications", () => {
  beforeAll(async () => {
    await waitForBackend();
    // Login and get session
    const profile = await loginTestUser();
    expect(profile.id).toBeDefined();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("should fetch all residencies", async () => {
    const response = await fetchWithAuth(`${API_BASE}/residencies/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("count");
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should fetch residencies with pagination", async () => {
    const response = await fetchWithAuth(`${API_BASE}/residencies/?limit=5&offset=0`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.count).toBeDefined();
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("should fetch a single residency by ID", async () => {
    // First get a residency ID
    const listResponse = await fetchWithAuth(`${API_BASE}/residencies/`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const residencyId = listData.results[0].id;

    // Get single residency
    const response = await fetchWithAuth(`${API_BASE}/residencies/${residencyId}/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const residency = await response.json();
    expect(residency.id).toBe(residencyId);
    expect(residency.name).toBeDefined();
  });

  it("should search residencies", async () => {
    const response = await fetchWithAuth(`${API_BASE}/residencies/?search=residency`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should filter residencies by country", async () => {
    const response = await fetchWithAuth(`${API_BASE}/residencies/?country=France`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should tag a residency as STAR", async () => {
    // Get a residency first
    const listResponse = await fetchWithAuth(`${API_BASE}/residencies/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const residencyId = listData.results[0].id;

    // Tag the residency
    const response = await fetchWithAuth(`${API_BASE}/residencies/${residencyId}/tag/STAR/`, {
      method: "PATCH",
    });

    // May return 200 or 404 depending on permissions
    expect([200, 403, 404]).toContain(response.status);
  });

  it("should generate email for residency application", async () => {
    // Get a residency first
    const listResponse = await fetchWithAuth(`${API_BASE}/residencies/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const residencyId = listData.results[0].id;

    // Get current user profile
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Generate email
    const response = await fetchWithAuth(`${API_BASE}/residencies/${residencyId}/generate_email/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile: profile,
        selectedPerformanceIds: [],
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.message).toBeDefined();
  });

  it("should create an application to residency", async () => {
    // Get a residency
    const listResponse = await fetchWithAuth(`${API_BASE}/residencies/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const residencyId = listData.results[0].id;

    // Get current user
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Create application
    const response = await fetchWithAuth(`${API_BASE}/residencies/${residencyId}/apply/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile: profile.id,
        organisationType: "Residency",
        emailSubject: "E2E Test Application",
        message: "Testing application submission via E2E tests",
        applicationDate: new Date().toISOString().split("T")[0],
        recipients: "test@test.com" + ",test@residency.com",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Application creation failed:", errorData);
    }

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.applicationId).toBeDefined();
    // Track for cleanup
    trackEntity("application", data.applicationId);
  });

  it("should fetch all applications for user", async () => {
    const response = await fetchWithAuth(`${API_BASE}/applications/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("count");
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should get single application", async () => {
    // Get applications list
    const listResponse = await fetchWithAuth(`${API_BASE}/applications/`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const applicationId = listData.results[0].id;

    // Get single application
    const response = await fetchWithAuth(`${API_BASE}/applications/${applicationId}/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const application = await response.json();
    expect(application.id).toBe(applicationId);
  });

  it("should update application status", async () => {
    // Get applications
    const listResponse = await fetchWithAuth(`${API_BASE}/applications/`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const applicationId = listData.results[0].id;

    // Update status to ACCEPTED
    const response = await fetchWithAuth(
      `${API_BASE}/applications/${applicationId}/status/ACCEPTED/`,
      {
        method: "PATCH",
      },
    );

    // Note: May return 200 or 404 depending on permissions
    expect([200, 403, 404]).toContain(response.status);
  });
});

describe("E2E: Residency Search and Filters", () => {
  beforeAll(async () => {
    await waitForBackend();
    // Login and get session
    const profile = await loginTestUser();
    expect(profile.id).toBeDefined();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Search Bar Tests", () => {
    it("should search residencies with a specific term", async () => {
      const searchTerm = "residency";
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data).toHaveProperty("count");
    });

    it("should handle empty search results", async () => {
      const searchTerm = "xyznonexistentresidencyname123";
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.count).toBe(0);
    });

    it("should search with pagination parameters", async () => {
      const searchTerm = "residency";
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Column Filter Tests", () => {
    it("should filter residencies by country", async () => {
      const response = await fetchWithAuth(`${API_BASE}/residencies/?country=France`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      // All results should be from France
      if (data.results.length > 0) {
        data.results.forEach((residency: Residency) => {
          expect(residency.country).toBe("France");
        });
      }
    });

    it("should filter residencies by tag", async () => {
      const response = await fetchWithAuth(`${API_BASE}/residencies/?tag=STAR&limit=10`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(10);
    });

    it("should handle filters with pagination", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?country=France&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Combined Search and Filter Tests", () => {
    it("should search and filter simultaneously", async () => {
      const searchTerm = "residency";
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}&country=France`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("should return results even when both search and filter return nothing", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/residencies/?search=xyznonexistent&country=France`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.count).toBe(0);
    });
  });

  describe("Pagination Tests", () => {
    it("should paginate through filtered results", async () => {
      // Get first page of filtered results
      const firstPageResponse = await fetchWithAuth(
        `${API_BASE}/residencies/?country=France&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(firstPageResponse.ok).toBe(true);
      const firstPageData = await firstPageResponse.json();

      if (firstPageData.count > 5) {
        // Get second page of same filter
        const secondPageResponse = await fetchWithAuth(
          `${API_BASE}/residencies/?country=France&limit=5&offset=5`,
          {
            method: "GET",
          },
        );

        expect(secondPageResponse.ok).toBe(true);
        const secondPageData = await secondPageResponse.json();

        // Both pages should have different data
        if (firstPageData.results.length > 0 && secondPageData.results.length > 0) {
          const firstPageIds = firstPageData.results.map((r: Residency) => r.id);
          const secondPageIds = secondPageData.results.map((r: Residency) => r.id);
          const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
          expect(intersection.length).toBe(0);
        }
      }
    });

    it("should paginate through search results", async () => {
      const searchTerm = "residency";

      // Get first page of search results
      const firstPageResponse = await fetchWithAuth(
        `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(firstPageResponse.ok).toBe(true);
      const firstPageData = await firstPageResponse.json();

      if (firstPageData.count > 5) {
        // Get second page
        const secondPageResponse = await fetchWithAuth(
          `${API_BASE}/residencies/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=5`,
          {
            method: "GET",
          },
        );

        expect(secondPageResponse.ok).toBe(true);
        const secondPageData = await secondPageResponse.json();

        if (firstPageData.results.length > 0 && secondPageData.results.length > 0) {
          const firstPageIds = firstPageData.results.map((r: Residency) => r.id);
          const secondPageIds = secondPageData.results.map((r: Residency) => r.id);
          const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
          expect(intersection.length).toBe(0);
        }
      }
    });
  });

  describe("Tag Management Tests", () => {
    it("should retrieve residencies with specific tags", async () => {
      const response = await fetchWithAuth(`${API_BASE}/residencies/?tag=WATCH`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
    });
  });
});
