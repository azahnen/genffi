import { describe, it, expect } from "@jest/globals";
import { typeToC } from "../c.ts";

describe("typeToC", () => {
  const testCases = [
    { input: "boolean", expected: "short" },
    { input: "number", expected: "double" },
    { input: "bigint", expected: "longlong" },
    { input: "void", expected: "" },
    { input: "string", expected: "char*" },
    { input: "string[]", expected: "char**" },
    { input: "Uint8Array", expected: "char*" },
    { input: "MyStruct", expected: "MyStruct" },
    { input: "MyStruct[]", expected: "MyStruct*" },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should return '${expected}' for '${input}'`, () => {
      const result = typeToC(input);
      expect(result).toBe(expected);
    });
  });

  it("should throw error for tuples like '[number,string]'", () => {
    expect(() => {
      typeToC("[number,string]");
    }).toThrowError("Tuples not supported: [number,string]");
  });

  it("should throw error for unknown lowercase type like 'myunknown'", () => {
    expect(() => {
      typeToC("myunknown");
    }).toThrowError("Unknown type: myunknown");
  });
});
