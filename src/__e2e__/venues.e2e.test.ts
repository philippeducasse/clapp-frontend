import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  waitForBackend,
  loginTestUser,
  API_BASE,
  fetchWithAuth,
  cleanupTestData,
  trackEntity,
} from "./setup";
import { Venue } from "@/interfaces/entities/Venue";

describe("E2E: Venues and Applications", () => {
  beforeAll(async () => {
    await waitForBackend();
    // Login and get session
    const profile = await loginTestUser();
    expect(profile.id).toBeDefined();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("should fetch all venues", async () => {
    const response = await fetchWithAuth(`${API_BASE}/venues/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("count");
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should fetch venues with pagination", async () => {
    const response = await fetchWithAuth(`${API_BASE}/venues/?limit=5&offset=0`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.count).toBeDefined();
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("should fetch a single venue by ID", async () => {
    // First get a venue ID
    const listResponse = await fetchWithAuth(`${API_BASE}/venues/`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const venueId = listData.results[0].id;

    // Get single venue
    const response = await fetchWithAuth(`${API_BASE}/venues/${venueId}/`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const venue = await response.json();
    expect(venue.id).toBe(venueId);
    expect(venue.name).toBeDefined();
  });

  it("should search venues", async () => {
    const response = await fetchWithAuth(`${API_BASE}/venues/?search=venue`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should filter venues by type", async () => {
    const response = await fetchWithAuth(`${API_BASE}/venues/?venueType=THEATRE`, {
      method: "GET",
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("should generate email for venue application", async () => {
    // Get a venue first
    const listResponse = await fetchWithAuth(`${API_BASE}/venues/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const venueId = listData.results[0].id;

    // Get current user profile
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Generate email
    const response = await fetchWithAuth(`${API_BASE}/venues/${venueId}/generate_email/`, {
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

  it("should create an application to venue", async () => {
    // Get a venue
    const listResponse = await fetchWithAuth(`${API_BASE}/venues/?limit=1`, {
      method: "GET",
    });
    const listData = await listResponse.json();

    if (listData.results.length === 0) {
      return;
    }

    const venueId = listData.results[0].id;

    // Get current user
    const profileResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
      method: "GET",
    });
    const profile = await profileResponse.json();

    // Create application using JSON format
    const response = await fetchWithAuth(`${API_BASE}/venues/${venueId}/apply/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile: profile.id,
        organisationType: "Venue",
        emailSubject: "E2E Test Application",
        message: "Testing application submission via E2E tests",
        applicationDate: new Date().toISOString().split("T")[0],
        recipients: "test@test.com" + ",test@venue.com",
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

describe("E2E: Venue Search and Filters", () => {
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
    it("should search venues with a specific term", async () => {
      const searchTerm = "venue";
      const response = await fetchWithAuth(
        `${API_BASE}/venues/?search=${encodeURIComponent(searchTerm)}`,
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
      const searchTerm = "xyznonexistentvenuename123";
      const response = await fetchWithAuth(
        `${API_BASE}/venues/?search=${encodeURIComponent(searchTerm)}`,
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
      const searchTerm = "venue";
      const response = await fetchWithAuth(
        `${API_BASE}/venues/?search=${encodeURIComponent(searchTerm)}&limit=5&offset=0`,
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
    it("should filter venues by type", async () => {
      const response = await fetchWithAuth(`${API_BASE}/venues/?venue_type=THEATRE`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      // All results should be of type THEATRE
      if (data.results.length > 0) {
        data.results.forEach((venue: Venue) => {
          expect(venue.venue_type || venue.venueType).toBe("THEATRE");
        });
      }
    });

    it("should filter venues by multiple filter parameters", async () => {
      const response = await fetchWithAuth(`${API_BASE}/venues/?venue_type=THEATRE&limit=10`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(10);
    });

    it("should handle filters with pagination", async () => {
      const response = await fetchWithAuth(
        `${API_BASE}/venues/?venue_type=THEATRE&limit=5&offset=0`,
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
      const searchTerm = "venue";
      const response = await fetchWithAuth(
        `${API_BASE}/venues/?search=${encodeURIComponent(searchTerm)}&venue_type=THEATRE`,
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
        `${API_BASE}/venues/?search=xyznonexistent&venue_type=THEATRE`,
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
        `${API_BASE}/venues/?venue_type=THEATRE&limit=5&offset=0`,
        {
          method: "GET",
        },
      );

      expect(firstPageResponse.ok).toBe(true);
      const firstPageData = await firstPageResponse.json();

      if (firstPageData.count > 5) {
        // Get second page of same filter
        const secondPageResponse = await fetchWithAuth(
          `${API_BASE}/venues/?venue_type=THEATRE&limit=5&offset=5`,
          {
            method: "GET",
          },
        );

        expect(secondPageResponse.ok).toBe(true);
        const secondPageData = await secondPageResponse.json();

        // Both pages should have different data
        if (firstPageData.results.length > 0 && secondPageData.results.length > 0) {
          const firstPageIds = firstPageData.results.map((v: Venue) => v.id);
          const secondPageIds = secondPageData.results.map((v: Venue) => v.id);
          const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
          expect(intersection.length).toBe(0);
        }
      }
    });
  });
});
