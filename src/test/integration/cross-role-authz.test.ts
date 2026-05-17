import { describe, it, expect, vi, beforeAll } from "vitest";
import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import path from "path";

// Mock every service the resolvers depend on so this test doesn't pull
// the real Postgres pool into the loop. The mocks must exist BEFORE we
// import the resolver modules.
vi.mock("../../features/appointments/appointments.service", () => ({
  appointmentsService: {
    getAppointment: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    removeAppointment: vi.fn(),
  },
}));

vi.mock("../../features/doctors/doctors.service", () => ({
  doctorsService: {
    getDoctors: vi.fn(),
    getDoctor: vi.fn(),
    getAllSpecializations: vi.fn(),
    updateDoctorProfile: vi.fn(),
    addDoctorSpecialization: vi.fn(),
    removeDoctorSpecialization: vi.fn(),
    updateDoctorSpecialization: vi.fn(),
    addDoctorAvailability: vi.fn(),
    removeDoctorAvailability: vi.fn(),
  },
}));

vi.mock("../../features/owners/owners.service", () => ({
  ownersService: {
    getOwner: vi.fn(),
    updateOwnerProfile: vi.fn(),
  },
}));

vi.mock("../../features/pets/pets.service", () => ({
  petsService: {
    getPet: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
  },
}));

import { resolvers } from "../../schema/resolvers";
import { requireAuthMutations } from "../../schema/plugins/requireAuthMutations";

let server: ApolloServer;

beforeAll(async () => {
  const typeDefs = readFileSync(
    path.join(__dirname, "../../schema/typeDefs.graphql"),
    "utf-8"
  );

  server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [requireAuthMutations],
  });
  await server.start();
});

const baseContext = {
  db: {} as never,
  doctorLoaders: {} as never,
  petLoaders: {} as never,
  ownerLoaders: {} as never,
};

describe("Schema-level authorization", () => {
  it("rejects unauthenticated queries with UNAUTHENTICATED", async () => {
    const res = await server.executeOperation(
      {
        query: `query { specializations { id name } }`,
      },
      { contextValue: { ...baseContext, user: null } }
    );

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      const errors = res.body.singleResult.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects unauthenticated mutations at the operation level (no resolver runs)", async () => {
    // requireAuthMutations runs in didResolveOperation, so the mocked service
    // method MUST NOT be called when there is no user.
    const { petsService } = await import("../../features/pets/pets.service");
    const createPet = vi.mocked(petsService.createPet);
    createPet.mockClear();

    const res = await server.executeOperation(
      {
        query: `
          mutation Create($input: CreatePetInput!) {
            createPet(input: $input) { id name }
          }
        `,
        variables: {
          input: {
            ownerId: "00000000-0000-0000-0000-000000000001",
            name: "Buddy",
            type: "Dog",
            breed: "Labrador",
            age: 3,
            weight: 25,
          },
        },
      },
      { contextValue: { ...baseContext, user: null } }
    );

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      const errors = res.body.singleResult.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
      // Resolver was short-circuited — no service work was kicked off.
      expect(createPet).not.toHaveBeenCalled();
    }
  });

  it("permits a query when a user is present in the context", async () => {
    const { doctorsService } = await import(
      "../../features/doctors/doctors.service"
    );
    vi.mocked(doctorsService.getAllSpecializations).mockResolvedValue([
      { id: "spec-1", name: "Dermatology" } as never,
    ]);

    const res = await server.executeOperation(
      {
        query: `query { specializations { id name } }`,
      },
      {
        contextValue: {
          ...baseContext,
          user: {
            id: "doctor-1",
            email: "doc@example.com",
            role: "doctor",
          } as never,
        },
      }
    );

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeUndefined();
      expect(res.body.singleResult.data).toEqual({
        specializations: [{ id: "spec-1", name: "Dermatology" }],
      });
    }
  });

  it("propagates a service-layer FORBIDDEN error when a user requests another owner's pet", async () => {
    const { petsService } = await import("../../features/pets/pets.service");
    const { GraphQLError } = await import("graphql");
    // Cross-role authz is enforced inside the service. Simulate the service
    // throwing FORBIDDEN to verify the schema surfaces it cleanly to clients.
    vi.mocked(petsService.getPet).mockRejectedValue(
      new GraphQLError("You do not have permission to view this pet.", {
        extensions: { code: "FORBIDDEN" },
      })
    );

    const res = await server.executeOperation(
      {
        query: `query GetPet($id: ID!) { pet(id: $id) { id name } }`,
        variables: { id: "someone-elses-pet" },
      },
      {
        contextValue: {
          ...baseContext,
          user: {
            id: "owner-A",
            email: "a@example.com",
            role: "owner",
          } as never,
          petLoaders: { petById: { load: vi.fn() } } as never,
        },
      }
    );

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      const errors = res.body.singleResult.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    }
  });
});
