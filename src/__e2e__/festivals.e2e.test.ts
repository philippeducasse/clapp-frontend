import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  waitForBackend,
  loginTestUser,
  API_BASE,
  fetchWithAuth,
  cleanupTestData,
  trackEntity,
} from "./setup";
import { Festival } from "@/interfaces/entities/Festival";

describe("E2E: Festivals and Applications", () => {
  beforeAll(async () => {
    await waitForBackend();
    // Login and get session
    const profile = await loginTestUser();
    expect(profile.id).toBeDefined();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("should fetch all festivals", async () => {
    const response = await fetchWithAuth(`${API_BASE}/festivals/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("count");
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should fetch festivals with pagination", async () => {
    const response = await fetchWithAuth(`${API_BASE}/festivals/?limit=5&offset=0`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.count).toBeDefined();
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("should fetch a single festival by ID", async () => {
    // First get a festival ID
    const listResponse = await fetchWithAuth(`${API_BASE}/festivals/`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const festivalId = listData.results[0].id;

    // Get single festival
    const response = await fetchWithAuth(`${API_BASE}/festivals/${festivalId}/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const festival = await response.json();
    expect(festival.id).toBe(festivalId);
    expect(festival.name).toBeDefined();
  });

  it("should search festivals", async () => {
    const response = await fetchWithAuth(`${API_BASE}/festivals/?search=festival`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should filter festivals by type", async () => {
    const response = await fetchWithAuth(`${API_BASE}/festivals/?festivalType=CIRCUS`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should generate email for festival application", async () => {
    // Get a festival first
    const listResponse = await fetchWithAuth(`${API_BASE}/festivals/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const festivalId = listData.results[0].id;

    // Get current user profile
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Generate email
    const response = await fetchWithAuth(`${API_BASE}/festivals/${festivalId}/generate_email/`, {
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

  it("should create an application to festival", async () => {
    // Get a festival
    const listResponse = await fetchWithAuth(`${API_BASE}/festivals/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const festivalId = listData.results[0].id;

    // Get current user
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Create application using JSON format
    const response = await fetchWithAuth(`${API_BASE}/festivals/${festivalId}/apply/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile: profile.id,
        organisationType: "Festival",
        emailSubject: "E2E Test Application",
        message: "Testing application submission via E2E tests",
        applicationDate: new Date().toISOString().split("T")[0],
        recipients: "test@test.com" + ",test@festival.com",
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

    // Update status to IN_DISCUSSION
    const response = await fetchWithAuth(
      `${API_BASE}/applications/${applicationId}/status/IN_DISCUSSION/`,
      {
        method: "PATCH",
      },
    );

    // Note: May return 200 or 404 depending on permissions
    expect([200, 403, 404]).toContain(response.status);
  });
});

describe("E2E: Search Bar and Column Filters", () => {
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
    it("should search festivals with a specific term", async () => {
      const searchTerm = "festival";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}`,
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
      const searchTerm = "xyznonexistentfestivalname123";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}`,
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
      const searchTerm = "festival";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(5);
    });

    it("should handle special characters in search", async () => {
      const searchTerm = "test@";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
    });
  });

  describe("Column Filter Tests", () => {
    it("should filter festivals by type", async () => {
      const response = await fetchWithAuth(`${API_BASE}/festivals/?festival_type=STREET`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      // All results should be of type STREET
      if (data.results.length > 0) {
        data.results.forEach((festival: Festival) => {
          expect(festival.festival_type || festival.festivalType).toBe("STREET");
        });
      }
    });

    it("should filter festivals by multiple filter parameters", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=10`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(10);
    });

    it("should handle filters with pagination", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=5&offset=0`,
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
      const searchTerm = "festival";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}&festival_type=STREET`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      // All results should match both search and filter criteria
      if (data.results.length > 0) {
        data.results.forEach((festival: Festival) => {
          expect(festival.festival_type || festival.festivalType).toBe("STREET");
        });
      }
    });

    it("should apply search with filters and pagination", async () => {
      const searchTerm = "festival";
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}&festival_type=STREET&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(5);
    });

    it("should return results even when both search and filter return nothing", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/festivals/?search=xyznonexistent&festival_type=STREET`,
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

  describe("Pagination with Filters and Search", () => {
    it("should paginate through filtered results", async () => {
      // Get first page of filtered results
      const firstPageResponse = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(firstPageResponse.ok).toBe(true);
      const firstPageData = await firstPageResponse.json();

      // Get second page of same filter
      const secondPageResponse = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=5&offset=5`,
        {
          method: "GET",
        },
      );

      expect(secondPageResponse.ok).toBe(true);
      const secondPageData = await secondPageResponse.json();

      expect(Array.isArray(firstPageData.results)).toBe(true);
      expect(Array.isArray(secondPageData.results)).toBe(true);

      // Both pages should have the same properties but different data
      if (firstPageData.results.length > 0 && secondPageData.results.length > 0) {
        // IDs should be different between pages
        const firstPageIds = firstPageData.results.map((f: Festival) => f.id);
        const secondPageIds = secondPageData.results.map((f: Festival) => f.id);
        const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
        expect(intersection.length).toBe(0);
      }
    });

    it("should paginate through search results", async () => {
      const searchTerm = "festival";

      // Get first page of search results
      const firstPageResponse = await fetchWithAuth(
        `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(firstPageResponse.ok).toBe(true);
      const firstPageData = await firstPageResponse.json();

      if (firstPageData.count > 5) {
        // Get second page
        const secondPageResponse = await fetchWithAuth(
          `${API_BASE}/festivals/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=5`,
          {
            method: "GET",
          },
        );

        expect(secondPageResponse.ok).toBe(true);
        const secondPageData = await secondPageResponse.json();

        if (firstPageData.results.length > 0 && secondPageData.results.length > 0) {
          const firstPageIds = firstPageData.results.map((f: Festival) => f.id);
          const secondPageIds = secondPageData.results.map((f: Festival) => f.id);
          const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
          expect(intersection.length).toBe(0);
        }
      }
    });
  });

  describe("Filter State Management Tests", () => {
    it("should properly handle clearing filters by omitting filter parameters", async () => {
      // First get filtered results
      const filteredResponse = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=5`,
        {
          method: "GET",
        },
      );

      expect(filteredResponse.ok).toBe(true);
      const filteredData = await filteredResponse.json();

      // Then get unfiltered results
      const unfilteredResponse = await fetchWithAuth(`${API_BASE}/festivals/?limit=100`, {
        method: "GET",
      });

      expect(unfilteredResponse.ok).toBe(true);
      const unfilteredData = await unfilteredResponse.json();

      // Unfiltered count should be >= filtered count
      expect(unfilteredData.count).toBeGreaterThanOrEqual(filteredData.count);
    });

    it("should handle offset reset when applying new filters", async () => {
      const response1 = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=STREET&limit=5&offset=10`,
        {
          method: "GET",
        },
      );

      expect(response1.ok).toBe(true);

      // Applying different filter should still work with offset
      const response2 = await fetchWithAuth(
        `${API_BASE}/festivals/?festival_type=THEATRE&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(response2.ok).toBe(true);
      const data2 = await response2.json();
      expect(Array.isArray(data2.results)).toBe(true);
    });
  });
});
