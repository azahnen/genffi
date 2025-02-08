//import { equal, deepEqual } from "node:assert/strict";
import { describe, it, expect } from "@jest/globals";
import {
  generateCgoWrapper,
  intfaceToVar,
  intfaceToGetter,
  intfaceToInit,
  intfaceToHandles,
  structMapper,
  enumMapper,
  propFromC,
  propFromGo,
  propFromGoPointer,
  structToC,
  enumToC,
  propToC,
  funcToGo,
  valueToGo,
  valueToCgoParam,
  valueToCgoReturn,
  typeToCgo,
} from "../cgo.ts";
import {
  ApiType,
  InterfaceType,
  StructType,
  VarType,
  FunctionType,
} from "../../common/api.ts";

const mockApi: ApiType = {
  interfaces: [
    {
      name: "TestInterface",
      handle: true,
      fold: false,
      singleton: false,
      functions: [
        {
          name: "TestFunction",
          params: [{ name: "param1", type: "string" }],
          returnType: "void",
          returnOptional: false,
          throws: false,
        },
      ],
    },
  ],
  enums: [],
  structs: [],
};

describe("generateCgoWrapper", () => {
  it("should generate a valid Result object", () => {
    const result = generateCgoWrapper(
      "TestName",
      mockApi,
      "testPkg",
      "testPkgApi",
      "testModule",
      ["dataNs1", "dataNs2"],
      { prefix1: "prefixValue1" }
    );

    expect(result.name).toEqual("TestName");
    expect(result.files.length).toEqual(1);
  });
});

describe("intfaceToVar", () => {
  it("should generate a valid variable declaration", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToVar(intface);
    expect(result).toEqual("var testInterface api.TestInterface");
  });
});

describe("intfaceToGetter", () => {
  it("should generate a valid getter function", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToGetter(intface);
    expect(result).toEqual("TestInterface() api.TestInterface");
  });
});

describe("intfaceToInit", () => {
  it("should generate a valid init function", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToInit(intface);
    expect(result).toEqual("testInterface = init.TestInterface()");
  });
});

describe("intfaceToHandles", () => {
  it("should generate a valid handles declaration", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: true,
      fold: false,
      singleton: false,
      functions: [],
    };
    const result = intfaceToHandles(intface);
    expect(result).toEqual("var testInterface_handles []api.TestInterface");
  });
});

describe("structMapper", () => {
  it("should generate valid Go and C struct mappings", () => {
    const struct: StructType = {
      name: "TestStruct",
      properties: [
        { name: "prop1", type: "string", enum: false },
        { name: "prop2", type: "number", enum: false },
      ],
    };
    const result = structMapper(struct);
    expect(
      result.includes("func GoTestStruct(fromC *C.TestStruct) api.TestStruct")
    ).toEqual(true);
    expect(
      result.includes("func CTestStruct(fromGo api.TestStruct) C.TestStruct")
    ).toEqual(true);
  });
});

describe("enumMapper", () => {
  it("should generate valid Go and C enum mappings", () => {
    const enumType: StructType = {
      name: "TestEnum",
      properties: [
        { name: "Value1", type: "number", enum: true },
        { name: "Value2", type: "number", enum: true },
      ],
    };
    const result = enumMapper(enumType);
    expect(
      result.includes("func GoTestEnum(fromC *C.TestEnum) api.TestEnum")
    ).toEqual(true);
    expect(
      result.includes("func CTestEnum(fromGo api.TestEnum) C.TestEnum")
    ).toEqual(true);
  });
});

describe("propFromC", () => {
  it("should generate a valid property from C", () => {
    const prop: VarType = { name: "prop1", type: "string", enum: false };
    const result = propFromC(prop);
    expect(result).toEqual("Prop1: C.GoString(fromC.prop1)");
  });
});

describe("propFromGo", () => {
  it("should generate a valid property from Go", () => {
    const prop: VarType = { name: "prop1", type: "string", enum: false };
    const result = propFromGo(prop);
    expect(result).toEqual("prop1: C.CString(fromGo.Prop1)");
  });
});

describe("propFromGoPointer", () => {
  it("should generate a valid property from Go with pointer", () => {
    const prop: VarType = { name: "prop1", type: "string", enum: false };
    const result = propFromGoPointer(prop);
    expect(result).toEqual("prop1: C.CString(fromGo.Prop1)");
  });
});

describe("structToC", () => {
  it("should generate a valid C struct", () => {
    const struct: StructType = {
      name: "TestStruct",
      properties: [
        { name: "prop1", type: "string", enum: false },
        { name: "prop2", type: "number", enum: false },
      ],
    };
    const result = structToC(struct);
    expect(result.includes("typedef struct TestStruct")).toEqual(true);
    expect(result.includes("char* prop1;")).toEqual(true);
    expect(result.includes("double prop2;")).toEqual(true);
  });
});

describe("enumToC", () => {
  it("should generate a valid C enum", () => {
    const enumType: StructType = {
      name: "TestEnum",
      properties: [
        { name: "Value1", type: "number", enum: true },
        { name: "Value2", type: "number", enum: true },
      ],
    };
    const result = enumToC(enumType);
    expect(result.includes("typedef enum TestEnum")).toEqual(true);
    expect(result.includes("Value1,")).toEqual(true);
    expect(result.includes("Value2")).toEqual(true);
  });
});

describe("propToC", () => {
  it("should generate a valid C property", () => {
    const prop: VarType = { name: "prop1", type: "string", enum: false };
    const result = propToC(prop);
    expect(result).toEqual("char* prop1");
  });
});

describe("funcToGo", () => {
  it("should generate a valid Go function", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: false,
      functions: [
        {
          name: "TestFunction",
          params: [{ name: "param1", type: "string" }],
          returnType: "void",
          returnOptional: false,
          throws: false,
        },
      ],
    };
    const special = { handle: [], fold: [], folded: {} };
    const result = funcToGo(intface, intface.functions[0], special);
    expect(
      result.includes("func TestInterface_TestFunction(param1 *C.char)")
    ).toEqual(true);
  });
});

describe("paramToGo", () => {
  it("should generate a valid Go parameter", () => {
    const result = valueToGo("string", "param1");
    expect(result).toEqual("C.GoString(param1)");
  });
});

describe("paramToC", () => {
  it("should generate a valid C parameter", () => {
    const result = valueToCgoParam("string", "param1");
    expect(result).toEqual("C.CString(param1)");
  });
});

describe("returnToC", () => {
  it("should generate a valid C return statement", () => {
    const result = valueToCgoReturn("string", "result");
    expect(result).toEqual("return C.CString(result)");
  });
});

describe("typeToCgo", () => {
  it("should generate a valid Cgo type", () => {
    const result = typeToCgo("string");
    expect(result).toEqual("*C.char");
  });
});

describe("intfaceToVar", () => {
  it("should generate a valid variable declaration", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToVar(intface);
    expect(result).toEqual("var testInterface api.TestInterface");
  });
});

describe("intfaceToGetter", () => {
  it("should generate a valid getter function", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToGetter(intface);
    expect(result).toEqual("TestInterface() api.TestInterface");
  });
});

describe("intfaceToInit", () => {
  it("should generate a valid init function", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: false,
      fold: false,
      singleton: true,
      functions: [],
    };
    const result = intfaceToInit(intface);
    expect(result).toEqual("testInterface = init.TestInterface()");
  });
});

describe("intfaceToHandles", () => {
  it("should generate a valid handles declaration", () => {
    const intface: InterfaceType = {
      name: "TestInterface",
      handle: true,
      fold: false,
      singleton: false,
      functions: [],
    };
    const result = intfaceToHandles(intface);
    expect(result).toEqual("var testInterface_handles []api.TestInterface");
  });
});
