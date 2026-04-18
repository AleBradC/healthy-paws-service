import { describe, it, expect } from "vitest";
import { hashPassword } from "./helpers";
import * as bcrypt from "bcrypt";

describe("helpers", () => {
  describe("hashPassword", () => {
    it("should correctly hash a password using bcrypt", async () => {
      const password = "password123";
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe("string");
      expect(hashedPassword).not.toBe(password);
      
      const isMatch = await bcrypt.compare(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "password123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
