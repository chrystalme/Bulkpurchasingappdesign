export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.mjs'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Needed for ESM support
  extensionsToTreatAsEsm: [],
};
