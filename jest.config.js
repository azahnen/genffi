/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
	testEnvironment: "node",
	testMatch: ["**/__tests__/**/*.[jt]s?(x)", "!**/__tests__/**/?(*.)fixtures.[jt]s?(x)"],
	transform: {
		"^.+.tsx?$": ["ts-jest",{}],
	},
	coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
};