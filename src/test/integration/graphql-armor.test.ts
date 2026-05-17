import { describe, it, expect, beforeAll } from "vitest";
import { ApolloServer } from "@apollo/server";
import { ApolloArmor } from "@escape.tech/graphql-armor";

// Minimal schema used purely to exercise graphql-armor's validation rules.
// The production schema is large; this isolates the test from changes to
// the real SDL and keeps the assertion focused on the protection layer.
const typeDefs = /* GraphQL */ `
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
  // Match the production armor configuration in src/app.ts. If those numbers
  // change there, change them here too.
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
      // 6 nested `child` selections + outer `node` is well under the 8-deep cap.
      query: buildNestedQuery(6),
    });

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeUndefined();
    }
  });

  it("rejects queries that exceed the depth limit", async () => {
    const res = await server.executeOperation({
      // Way over the maxDepth: 8 cap.
      query: buildNestedQuery(20),
    });

    expect(res.body.kind).toBe("single");
    if (res.body.kind === "single") {
      expect(res.body.singleResult.errors).toBeDefined();
      const messages =
        res.body.singleResult.errors?.map((e) => e.message.toLowerCase()) ?? [];
      // graphql-armor's depth plugin uses "depth" in the message; assert on
      // that rather than the exact phrasing so message tweaks don't break us.
      expect(messages.some((m) => m.includes("depth"))).toBe(true);
    }
  });

  it("rejects queries that exceed the token limit", async () => {
    // 2000 aliased selections blasts past the 1000-token cap. The token
    // limit fires during lexing, BEFORE Apollo can wrap it into a normal
    // response — graphql-armor surfaces it as a thrown GraphQLError.
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
    // 30 aliases on the same field — above the maxAliases: 15 cap.
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
