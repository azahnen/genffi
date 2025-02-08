/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
	testEnvironment: "node",
	testMatch: ["**/__tests__/**/*.[jt]s?(x)"],
	transform: {
		"^.+.tsx?$": ["ts-jest",{}],
	},
};