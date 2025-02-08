import { describe, it, expect } from "@jest/globals";
import {
  typeToLang,
  valueToLang,
  bridgeToLang,
  TypeMapping,
  ValueMapping,
  Special,
  BridgeMapping,
  TypeMapper,
  ValueMapper,
} from "../lang.ts";
import { FunctionType, InterfaceType, VarType } from "../api.ts";

// Mock data for testing
const typeMapper: TypeMapper = {
  boolean: "bool",
  number: "int",
  bigint: "long",
  string: "str",
  Uint8Array: "byte[]",
  void: "void",
  toArray: (type: string) => `${type}[]`,
};

const valueMapper: ValueMapper = {
  boolean: (value) => `bool(${value})`,
  number: (value) => `int(${value})`,
  bigint: (value) => `long(${value})`,
  string: (value) => `str(${value})`,
  Uint8Array: (value) => `byte[](${value})`,
  void: () => "",
  toArray: (type: string, value: string) => `${type}[](${value})`,
  toCustom: (type: string, value: string) => `${type}(${value})`,
};

const special: Special = {
  handle: ["HandleType"],
  fold: ["FoldType"],
  folded: {
    FoldType: {
      params: ["param1", "param2"],
      returnType: "FoldedReturnType",
    },
  },
};

const bridge: BridgeMapping = {
  handle: "handle",
  closer: "closer",
  paramIn: (param) => `in_${param.type}`,
  paramOut: (param) => `out_${param.type}`,
  handles: (type) => `handles_${type}`,
  handleValue: (type) => `handleValue_${type}`,
  typeToName: (type) => `name_${type}`,
  cleanup: (type) => `cleanup_${type}`,
  folded: (obj) => `folded_${obj}`,
  obj: (type, handle, fold) => `obj_${type}_${handle}_${fold}`,
  wrapper: (iname, fname) => `wrapper_${iname}_${fname}`,
  wrapped: (iname, fname) => `wrapped_${iname}_${fname}`,
  call: (obj, func, params) => `call_${obj}_${func}_${params.join(",")}`,
  body1: (type, obj, func, params) => [
    `body1_${type}_${obj}_${func}_${params.join(",")}`,
  ],
  body2: (f, obj, func, params) => [`body2_${obj}_${func}_${params.join(",")}`],
  body3: (type, obj, func, params) => [
    `body3_${type}_${obj}_${func}_${params.join(",")}`,
  ],
  paramRet: (f) => [`paramRet_${f.name}`],
  return: (type, handle, fold) => `return_${type}_${handle}_${fold}`,
  funcDef: (name, params, returns, body) =>
    `funcDef_${name}_${params}_${returns}_${body}`,
};

describe("typeToLang", () => {
  it("should map basic types correctly", () => {
    expect(typeToLang("boolean", typeMapper)).toBe("bool");
    expect(typeToLang("number", typeMapper)).toBe("int");
  });

  it("should map array types correctly", () => {
    expect(typeToLang("boolean[]", typeMapper)).toBe("bool[]");
    expect(typeToLang("number[]", typeMapper)).toBe("int[]");
  });

  it("should throw error for unknown types", () => {
    expect(() => typeToLang("unknown", typeMapper)).toThrow(
      "Unknown type: unknown"
    );
  });
});

describe("valueToLang", () => {
  it("should map basic values correctly", () => {
    expect(valueToLang(valueMapper, "boolean", "true", "prefix_")).toBe(
      "prefix_bool(true)"
    );
    expect(valueToLang(valueMapper, "number", "42", "prefix_")).toBe(
      "prefix_int(42)"
    );
  });

  it("should map array values correctly", () => {
    expect(valueToLang(valueMapper, "boolean[]", "true", "prefix_")).toBe(
      "prefix_bool(true)"
    );
    expect(valueToLang(valueMapper, "number[]", "42", "prefix_")).toBe(
      "prefix_int(42)"
    );
  });

  it("should throw error for unknown types", () => {
    expect(() =>
      valueToLang(valueMapper, "unknown", "value", "prefix_")
    ).toThrow("Unknown type: unknown");
  });
});

describe("funcToLang", () => {
  const interfaceType: InterfaceType = {
    name: "TestInterface",
    handle: true,
    fold: true,
    singleton: false,
    functions: [],
  };

  const functionType: FunctionType = {
    name: "testFunction",
    params: [{ name: "i", type: "number" }],
    returnType: "boolean",
    returnOptional: false,
    throws: false,
  };

  it("should generate function definition correctly", () => {
    const result = bridgeToLang(interfaceType, functionType, special, bridge);
    expect(result).toContain("funcDef_wrapper_TestInterface_testFunction");
  });

  it("should handle special cases correctly", () => {
    const specialFunctionType: FunctionType = {
      name: "specialFunction",
      params: [{ name: "hand", type: "HandleType" }],
      returnType: "closer",
      returnOptional: false,
      throws: false,
    };
    const result = bridgeToLang(
      interfaceType,
      specialFunctionType,
      special,
      bridge
    );
    expect(result).toContain("funcDef_wrapper_TestInterface_specialFunction");
  });
});
