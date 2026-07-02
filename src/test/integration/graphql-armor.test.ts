import { describe, it, expect, beforeAll } from "vitest";
import { ApolloServer } from "@apollo/server";
import { ApolloArmor } from "@escape.tech/graphql-armor";

const typeDefs = `
  type Node {
    id: ID!
    child: Node
  }
  type Query {
    node: Node
  }
`;

const resolvers = {
  Query: {
    node: () => ({ id: "1", child: { id: "2", child: { id: "3" } } }),
  },
  Node: {
    child: (parent: { id: string }) => ({
      id: `${parent.id}-child`,
      child: null,
    }),
  },
};

let server: ApolloServer;

beforeAll(async () => {
  const armor = new ApolloArmor({
    blockFieldSuggestion: { enabled: true },
    maxDepth: { n: 8 },
    costLimit: { maxCost: 5000 },
    maxAliases: { n: 15 },
    maxDirectives: { n: 50 },
    maxTokens: { n: 1000 },
  });
  const protection = armor.protect();

  server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: false,
    plugins: [...protection.plugins],
    validationRules: [...protection.validationRules],
  });
  await server.start();
});

function buildNestedQuery(depth: number): string {
  let body = "id";
  for (let i = 0; i < depth; i++) body = `child { ${body} }`;
  return `query Deep { node { ${body} } }`;
}

describe("GraphQL armor", () => {
  it("accepts queries within the depth budget", async () => {
    const res = await server.executeOperation({
      query: buildNestedQuery(6),
    });

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeUndefined();
    }
  });

  it("rejects queries that exceed the depth limit", async () => {
    const res = await server.executeOperation({
      query: buildNestedQuery(20),
    });

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeDefined();
      const messages =
        res.body.singleResult.errors?.map((e) => e.message.toLowerCase()) ?? [];
      expect(messages.some((m) => m.includes("depth"))).toBe(true);
    }
  });

  it("rejects queries that exceed the token limit", async () => {
    const aliases = Array.from(
      { length: 2000 },
      (_, i) => `a${i}: node { id }`
    ).join("\n");

    let thrown: unknown;
    try {
      await server.executeOperation({
        query: `query Tokens { ${aliases} }`,
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeDefined();
    expect(String(thrown)).toMatch(/token/i);
  });

  it("rejects an excessive number of aliases on the same field", async () => {
    const aliases = Array.from(
      { length: 30 },
      (_, i) => `a${i}: node { id }`
    ).join("\n");
    const res = await server.executeOperation({
      query: `query Aliases { ${aliases} }`,
    });

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeDefined();
      const messages =
        res.body.singleResult.errors?.map((e) => e.message.toLowerCase()) ?? [];
      expect(messages.some((m) => m.includes("alias"))).toBe(true);
    }
  });
});
