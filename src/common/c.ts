import { TypeMapper, TypeMapping, typeToLang } from "./lang.ts";

const cTypeMapping: TypeMapper = {
  boolean: "short",
  number: "double",
  bigint: "longlong",
  string: "char*",
  //"string[]": "char**",
  Uint8Array: "char*",
  void: "",
  toArray: (type: string) => `${type}*`,
};

export const typeToC = (type: string): string => typeToLang(type, cTypeMapping);
