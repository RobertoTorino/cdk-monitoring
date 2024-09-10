module.exports = {
    collectCoverage: true, testEnvironment: 'node', roots: ['<rootDir>/test'], testMatch: ['**/*.test.ts'], transform: {
        '^.+\\.tsx?$': 'ts-jest',
    }, reporters: ['default', ['jest-junit', {outputDirectory: 'reports', outputName: 'test-report.xml'}],]
};
