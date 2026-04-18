import { petsResolvers } from "./pets.resolvers";
import { verifyPetOwnership, verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import { GraphQLContext } from "../../schema/loaders";
import { createPet, updatePet } from "./pets.repository";
import { vi, describe, beforeEach, it, expect } from "vitest";

vi.mock("../../core/utils/authorization.utils", () => ({
  verifyPetOwnership: vi.fn(),
  verifyOwnerOwnership: vi.fn(),
}));

vi.mock("./pets.repository", () => ({
  createPet: vi.fn(),
  updatePet: vi.fn(),
}));

describe("petsResolvers", () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyPetOwnership).mockReset();
    vi.mocked(verifyOwnerOwnership).mockReset();
    vi.mocked(createPet).mockReset().mockResolvedValue({ id: "new-pet", name: "Buddy" } as any);
    vi.mocked(updatePet).mockReset().mockResolvedValue({ id: "pet-1", name: "Updated Buddy" } as any);
    
    mockContext = {
      user: { id: "user-1", role: "owner" },
      petLoaders: {
        petById: { load: vi.fn() },
      },
    };
  });

  describe("Query.pet", () => {
    it("should call verifyPetOwnership and load the pet", async () => {
      const petId = "pet-1";
      const mockPet = { id: petId, name: "Luna" };
      mockContext.petLoaders.petById.load.mockResolvedValue(mockPet);

      const result = await petsResolvers.Query.pet(null, { id: petId }, mockContext as GraphQLContext);

      expect(verifyPetOwnership).toHaveBeenCalledWith("user-1", petId);
      expect(mockContext.petLoaders.petById.load).toHaveBeenCalledWith(petId);
      expect(result).toEqual(mockPet);
    });

    it("should throw if verifyPetOwnership fails", async () => {
      vi.mocked(verifyPetOwnership).mockRejectedValue(new Error("Forbidden"));
      
      await expect(petsResolvers.Query.pet(null, { id: "pet-1" }, mockContext as GraphQLContext))
        .rejects.toThrow("Forbidden");
    });
  });

  describe("Mutation.createPet", () => {
    it("should call verifyOwnerOwnership and create a pet", async () => {
      const input = { ownerId: "owner-1", name: "Buddy", type: "Dog", breed: "Golden Retriever", age: 3, weight: 25 };
      
      const result = await petsResolvers.Mutation.createPet(null, { input }, mockContext as GraphQLContext);

      expect(verifyOwnerOwnership).toHaveBeenCalledWith("user-1", "owner-1");
      expect(result).toEqual({ id: "new-pet", name: "Buddy" });
    });
  });

  describe("Mutation.updatePet", () => {
    it("should call verifyPetOwnership and update the pet", async () => {
      const input = { petId: "pet-1", name: "Updated Buddy", type: "Dog", breed: "Golden Retriever", age: 4, weight: 26 };
      
      const result = await petsResolvers.Mutation.updatePet(null, { input }, mockContext as GraphQLContext);

      expect(verifyPetOwnership).toHaveBeenCalledWith("user-1", "pet-1");
      expect(result).toEqual({ id: "pet-1", name: "Updated Buddy" });
    });
  });
});
