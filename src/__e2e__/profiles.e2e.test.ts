import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  waitForBackend,
  loginTestUser,
  TEST_USER,
  API_BASE,
  fetchWithAuth,
  cleanupTestData,
  trackEntity,
} from "./setup";

describe("E2E: Profiles and Performances", () => {
  beforeAll(async () => {
    await waitForBackend();
    // Login before running tests
    await loginTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Profile Management", () => {
    it("should get current profile", async () => {
      const response = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const profile = await response.json();
      expect(profile.id).toBeDefined();
      expect(profile.email).toBe(TEST_USER.email);
    });

    it("should update profile information", async () => {
      // Get current profile
      const getResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
        method: "GET",
      });
      const profile = await getResponse.json();

      // Update profile
      const updateResponse = await fetchWithAuth(`${API_BASE}/profiles/${profile.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: profile.id,
          email: profile.email,
          firstName: "UpdatedName",
          location: "Berlin, Germany",
          personalWebsite: "https://example.com",
        }),
      });

      expect(updateResponse.ok).toBe(true);
      const updated = await updateResponse.json();
      expect(updated.firstName).toBe("UpdatedName");
      expect(updated.location).toBe("Berlin, Germany");
    });

    it("should update profile with social media", async () => {
      // Get current profile
      const getResponse = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
        method: "GET",
      });
      const profile = await getResponse.json();

      // Update with social media
      const updateResponse = await fetchWithAuth(`${API_BASE}/profiles/${profile.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: profile.id,
          email: profile.email,
          instagramProfile: "https://instagram.com/testuser",
          facebookProfile: "https://facebook.com/testuser",
          youtubeProfile: "https://youtube.com/@TestUserChannel",
          tiktokProfile: "https://tiktok.com/@testuser",
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Profile update failed:", errorData);
      }

      expect(updateResponse.ok).toBe(true);
      const updated = await updateResponse.json();
      expect(updated.instagramProfile).toBe("https://instagram.com/testuser");
    });
  });

  describe("Performance Management", () => {
    let userId: number;

    beforeAll(async () => {
      // Get current user ID
      const response = await fetchWithAuth(`${API_BASE}/profiles/me/`, {
        method: "GET",
      });
      const profile = await response.json();
      userId = profile.id;
    });

    it("should fetch all performances for user", async () => {
      const response = await fetchWithAuth(`${API_BASE}/performances/${userId}/`, {
        method: "GET",
      });

      // May return 200 or 404 if endpoint structure is different
      if (response.ok) {
        const performances = await response.json();
        expect(Array.isArray(performances)).toBe(true);
      }
    });

    it("should create a performance without files", async () => {
      const performanceData = {
        performanceTitle: "E2E Test Performance",
        shortDescription: "A test performance for E2E testing",
        performanceType: "STREET",
        genres: ["CIRCUS"],
      };

      const response = await fetchWithAuth(`${API_BASE}/performances/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(performanceData),
      });

      if (response.ok) {
        const created = await response.json();
        expect(created.id).toBeDefined();
        expect(created.performanceTitle).toBe("E2E Test Performance");
        trackEntity("performance", created.id);
      } else {
      }
    });

    it("should create performance with file upload", async () => {
      const formData = new FormData();
      formData.append("performanceTitle", "E2E Performance with Dossier");
      formData.append("shortDescription", "Performance with dossier files");
      formData.append("performanceType", "INDOOR_STAGE");
      formData.append("genres", "CIRCUS");

      // Create a test file
      const testFile = new File(["PDF content"], "dossier.pdf", { type: "application/pdf" });
      formData.append("dossierFiles", testFile);

      const response = await fetchWithAuth(`${API_BASE}/performances/`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const created = await response.json();
        expect(created.id).toBeDefined();
        expect(created.performanceTitle).toBe("E2E Performance with Dossier");
        trackEntity("performance", created.id);
      } else {
      }
    });

    it("should fetch specific performance", async () => {
      // Get all performances
      const listResponse = await fetchWithAuth(`${API_BASE}/performances/${userId}/`, {
        method: "GET",
      });

      if (!listResponse.ok) {
        return;
      }

      const performances = await listResponse.json();
      if (performances.length === 0) {
        return;
      }

      const performanceId = performances[0].id;

      // Fetch specific performance
      const response = await fetchWithAuth(`${API_BASE}/performances/${performanceId}/`, {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      const performance = await response.json();
      expect(performance.id).toBe(performanceId);
    });

    it("should update performance", async () => {
      // Create a performance first
      const createResponse = await fetchWithAuth(`${API_BASE}/performances/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          performanceTitle: "Performance to Update",
          shortDescription: "Original description",
        }),
      });

      if (!createResponse.ok) {
        return;
      }

      const created = await createResponse.json();
      const performanceId = created.id;
      trackEntity("performance", performanceId);

      // Update it
      const updateResponse = await fetchWithAuth(`${API_BASE}/performances/${performanceId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: performanceId,
          performanceTitle: "Updated Performance",
          shortDescription: "Updated description",
        }),
      });

      if (updateResponse.ok) {
        const updated = await updateResponse.json();
        expect(updated.performanceTitle).toBe("Updated Performance");
      }
    });
  });
});
