/**
 * Mock database pool for testing (ESM-compatible).
 * Use with jest.unstable_mockModule.
 */

// Store mock results to be returned by queries
let mockQueryResults = [];
let mockQueryIndex = 0;

const mockClient = {
  query: async (sql, params) => {
    if (mockQueryIndex < mockQueryResults.length) {
      const result = mockQueryResults[mockQueryIndex++];
      if (result instanceof Error) throw result;
      return result;
    }
    return { rows: [], rowCount: 0 };
  },
  release: () => {},
};

const mockPool = {
  query: async (sql, params) => {
    if (mockQueryIndex < mockQueryResults.length) {
      const result = mockQueryResults[mockQueryIndex++];
      if (result instanceof Error) throw result;
      return result;
    }
    return { rows: [], rowCount: 0 };
  },
  connect: async () => mockClient,
};

/**
 * Set the sequence of results that mock queries will return.
 */
export function setMockQueryResults(results) {
  mockQueryResults = results;
  mockQueryIndex = 0;
}

/**
 * Reset all mocks between tests.
 */
export function resetMocks() {
  mockQueryResults = [];
  mockQueryIndex = 0;
}

export { mockClient };
export default mockPool;
