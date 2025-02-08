import { TypeMapping, typeToLang } from "./lang.ts";

const cTypeMapping: TypeMapping = {
  boolean: "short",
  number: "double",
  bigint: "longlong",
  string: "char*",
  //"string[]": "char**",
  Uint8Array: "char*",
  void: "",
};

const goTypeMapping: TypeMapping = {
  boolean: "bool",
  number: "float64",
  bigint: "int64",
  string: "string",
  //"string[]": "[]string",
  Uint8Array: "[]byte",
  void: "",
};

export const typeToC = (type: string): string =>
  typeToLang(type, cTypeMapping, (type: string) => `${type}*`);
