import {
  validateField,
  validateAllFields,
  createValidationRules,
} from "../validation";

describe("validationUtils", () => {
  describe("validateField", () => {
    it("should validate email field correctly", () => {
      const result = validateField("email", "test@example.com", {});
      expect(result.isValid).toBe(true);
    });

    it("should invalidate invalid email", () => {
      const result = validateField("email", "invalid-email", {});
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Please enter a valid email address");
    });

    it("should validate phone field correctly", () => {
      const result = validateField("phone", "+1234567890", {});
      expect(result.isValid).toBe(true);
    });

    it("should invalidate invalid phone", () => {
      const result = validateField("phone", "abc-def-ghij", {});
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Please enter a valid phone number");
    });

    it("should validate URL fields correctly", () => {
      const linkedinResult = validateField(
        "linkedin_url",
        "https://linkedin.com/in/test",
        {},
      );
      expect(linkedinResult.isValid).toBe(true);

      const githubResult = validateField(
        "github_url",
        "https://github.com/test",
        {},
      );
      expect(githubResult.isValid).toBe(true);
    });

    it("should invalidate invalid URLs", () => {
      const result = validateField("linkedin_url", "not-a-url", {});
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Please enter a valid LinkedIn URL");
    });

    it("should return true for optional fields when empty", () => {
      const result = validateField("email", "", {});
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateAllFields", () => {
    it("should validate all fields correctly", () => {
      const data = {
        email: "test@example.com",
        phone: "+1234567890",
        linkedin_url: "https://linkedin.com/in/test",
      };

      const result = validateAllFields(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should return errors for invalid fields", () => {
      const data = {
        email: "invalid-email",
        phone: "abc",
        linkedin_url: "not-a-url",
      };

      const result = validateAllFields(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty("email");
      expect(result.errors).toHaveProperty("phone");
      expect(result.errors).toHaveProperty("linkedin_url");
    });
  });

  describe("createValidationRules", () => {
    it("should create validation rules", () => {
      const rules = createValidationRules();
      expect(rules).toHaveLength(5);
      expect(rules[0].field).toBe("email");
      expect(rules[1].field).toBe("phone");
    });
  });
});
