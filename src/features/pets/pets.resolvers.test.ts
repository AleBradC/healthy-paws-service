import { petsResolvers } from "./pets.resolvers";
import { petsService } from "./pets.service";
import { GraphQLContext } from "../../schema/loaders";
import { vi, describe, beforeEach, it, expect } from "vitest";

import { Pet } from "../../types";

vi.mock("./pets.service", () => ({
  petsService: {
    getPet: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
  }
}));

describe("petsResolvers", () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(petsService.getPet).mockReset().mockResolvedValue("pet-1");
    vi.mocked(petsService.createPet).mockReset().mockResolvedValue({ id: "new-pet", name: "Buddy" } as unknown as Pet);
    vi.mocked(petsService.updatePet).mockReset().mockResolvedValue({ id: "pet-1", name: "Updated Buddy" } as unknown as Pet);
    
    mockContext = {
      user: { id: "user-1", role: "owner" },
      petLoaders: {
        petById: { load: vi.fn() },
      },
    } as unknown as GraphQLContext;
  });

  describe("Query.pet", () => {
    it("should call petsService.getPet and load the pet", async () => {
      const petId = "pet-1";
      const mockPet = { id: petId, name: "Luna" };
      vi.mocked(mockContext.petLoaders.petById.load).mockResolvedValue(mockPet as any);

      const result = await petsResolvers.Query.pet(null, { id: petId }, mockContext as GraphQLContext);

      expect(petsService.getPet).toHaveBeenCalledWith(petId, "user-1", "owner");
      expect(vi.mocked(mockContext.petLoaders.petById.load)).toHaveBeenCalledWith(petId);
      expect(result).toEqual(mockPet);
    });

    it("should throw if petsService.getPet fails", async () => {
      vi.mocked(petsService.getPet).mockRejectedValue(new Error("Forbidden"));
      
      await expect(petsResolvers.Query.pet(null, { id: "pet-1" }, mockContext as GraphQLContext))
        .rejects.toThrow("Forbidden");
    });
  });

  describe("Mutation.createPet", () => {
    it("should call petsService.createPet and return a new pet", async () => {
      const input = { ownerId: "owner-1", name: "Buddy", type: "Dog", breed: "Golden Retriever", age: 3, weight: 25 };
      
      const result = await petsResolvers.Mutation.createPet(null, { input }, mockContext as GraphQLContext);

      expect(petsService.createPet).toHaveBeenCalledWith(input, "user-1");
      expect(result).toEqual({ id: "new-pet", name: "Buddy" });
    });
  });

  describe("Mutation.updatePet", () => {
    it("should call petsService.updatePet and update the pet", async () => {
      const input = { petId: "pet-1", name: "Updated Buddy", type: "Dog", breed: "Golden Retriever", age: 4, weight: 26 };
      
      const result = await petsResolvers.Mutation.updatePet(null, { input }, mockContext as GraphQLContext);

      expect(petsService.updatePet).toHaveBeenCalledWith(input, "user-1");
      expect(result).toEqual({ id: "pet-1", name: "Updated Buddy" });
    });
  });
});
