import { langMapper, TypeMapper, ValueMapper } from "../common/lang.ts";

const typeMapperGo: TypeMapper = {
  boolean: "bool",
  number: "float64",
  bigint: "int64",
  string: "string",
  Uint8Array: "[]byte",
  void: "",
  toArray: (type: string) => `[]${type}`,
};

const valueMapperGo: ValueMapper = {
  boolean: (value) => `bool(${value} == 1)`,
  number: (value) => `float64(${value})`,
  bigint: (value) => `int64(${value})`,
  string: (value) => `C.GoString(${value})`,
  Uint8Array: (value) =>
    `C.GoBytes(unsafe.Pointer(${value}), C.int(C.strlen(${value})))`,
  void: (value) => value,
  toArray: (type: string, value: string) =>
    `GoMapSlice(${value}, int(${value}_length), Go${type})`,
  //return `[]api.${type.substring(0, type.length - 2)}{} /*TODO*/`;
  toCustom: (type: string, value: string) => `Go${type}(&${value})`,
};

export const go = langMapper(typeMapperGo, valueMapperGo);

const typeMapperCgo: TypeMapper = {
  boolean: "C.short",
  number: "C.double",
  bigint: "C.longlong",
  string: "*C.char",
  Uint8Array: "*C.char",
  void: "",
  toArray: (type: string) => `*${type}`,
  toCustom: (type: string) => `C.${type}`,
};

const valueMapperCgo: ValueMapper = {
  boolean: (value) => `CBool(${value})`,
  number: (value) => `C.double(${value})`,
  bigint: (value) => `C.longlong(${value})`,
  string: (value) => `C.CString(${value})`,
  Uint8Array: (value) => `(*C.char)(C.CBytes(${value}))`,
  void: (value) => value,
  toArray: (type: string, value: string) => `CMapSlice(${value}, C${type})`,
  toCustom: (type: string, value: string) => `C${type}(${value})`,
};

export const cgo = langMapper(typeMapperCgo, valueMapperCgo);
