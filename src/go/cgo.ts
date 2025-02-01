import {
  ApiType,
  FunctionType,
  InterfaceType,
  StructType,
  VarType,
} from "../common/api.js";
import { Generator } from "../common/index.js";
import { Result } from "../common/io.js";
import {
  firstLetterToLowerCase,
  firstLetterUpperCase,
} from "../common/schema.js";
import { generateFile } from "./shared.js";

type Special = {
  handle: string[];
  fold: string[];
  folded: {
    [key: string]: {
      params: string[];
      returnType: string;
    };
  };
};

export const generateCgoWrapper = (
  name: string,
  api: ApiType,
  pkg: string,
  pkgApi: string,
  module: string,
  dataNs: string[],
  filePrefixes: Record<string, string> = {}
) => {
  const result: Result = { name, files: [] };

  const specialTypes = {
    handle: api.interfaces.filter((i) => i.handle).map((i) => i.name),
    fold: api.interfaces.filter((i) => i.fold).map((i) => i.name),
    folded: {},
  };

  result.files.push(
    generateFile(
      "clib",
      "",
      pkg + "/main",
      filePrefixes,
      generateClib(api, module, pkg, pkgApi, specialTypes)
    )
  );

  return result;
};

const generateClib =
  (
    api: ApiType,
    module: string,
    pkgClib: string,
    pkgApi: string,
    special: Special
  ): Generator =>
  (name: string, pkg: string): string => {
    let code = `package main  

/*
#include <string.h>
${api.enums.map(enumToC).join("\n")}
${api.structs.map(structToC).join("\n")}
*/
import "C"
import "fmt"
import "unsafe"
import api "${module}/${pkgApi}"
import clib "${module}/${pkgClib}"

func main() {}

//=== INIT ===

${api.interfaces
  .filter((i) => i.singleton)
  .map(intfaceToVar)
  .join("\n")}
	

${api.interfaces
  .filter((i) => i.handle)
  .map(intfaceToHandles)
  .join("\n")}

type cInit interface {
	${api.interfaces
    .filter((i) => i.singleton)
    .map(intfaceToGetter)
    .join("\n    ")}
}

//export InitLibrary
func InitLibrary() {
	var init cInit = clib.NewInit()

	${api.interfaces
    .filter((i) => i.singleton)
    .map(intfaceToInit)
    .join("\n    ")}
}

${api.interfaces.map(intfaceToGo(special)).join("\n")}

//=== ENUMS ===

${api.enums.map(enumMapper).join("\n")}

//=== STRUCTS ===

${api.structs.map(structMapper).join("\n")}

//=== UTIL ===

func GoStringSlice(array **C.char, length int) []string {
	slice := make([]string, 0, length)
	for _, v := range unsafe.Slice(array, length) {
		slice = append(slice, C.GoString(v))
	}
	return slice
}

//TODO: free in c
func CStringSlice(array []string) **C.char {
	slice := make([]*C.char, 0, len(array))
	for _, v := range array {
		slice = append(slice, C.CString(v))
	}
	return &slice[0]
}
      
func CBool(flag bool) C.short {
	if flag {
		return C.short(1)
	}
	return C.short(0)
}

func GoMapSlice[T, U any](source *T, length int, f func(*T) U) []U {
	target := make([]U, 0, length)
	for _, t := range unsafe.Slice(source, length) {
		target = append(target, f(&t))
	}
	return target
}

func CMapSlice[T, U any](source []T, f func(T) U) *U {
	target := make([]U, 0, len(source))
	for _, t := range source {
		target = append(target, f(t))
	}
	return &target[0]
}
      `;

    return code;
  };

const intfaceToGo =
  (special: Special) =>
  (i: InterfaceType): string => {
    const funcs = i.functions.map((f) => funcToGo(i, f, special)).join("\n\n");

    return `
//=== ${i.name} ===

${funcs}
`;
  };

const intfaceToVar = (i: InterfaceType): string => {
  return `var ${firstLetterToLowerCase(i.name)} api.${i.name}`;
};

const intfaceToGetter = (i: InterfaceType): string => {
  return `${firstLetterUpperCase(i.name)}() api.${firstLetterUpperCase(
    i.name
  )}`;
};

const intfaceToInit = (i: InterfaceType): string => {
  return `${firstLetterToLowerCase(i.name)} = init.${firstLetterUpperCase(
    i.name
  )}()`;
};

const intfaceToHandles = (i: InterfaceType): string => {
  return `var ${firstLetterToLowerCase(i.name)}_handles []api.${i.name}`;
};

const structMapper = (i: StructType): string => {
  const propsGo = i.properties.map(propFromC).join(",\n  ");
  const propsC = i.properties
    .map((p) => (p.enum ? propFromGo(p) : propFromGoPointer(p)))
    .join(",\n  ");

  return `
func Go${i.name}(fromC *C.${i.name}) api.${i.name} {
	return api.${i.name}{
		${propsGo},
	}
}

func C${i.name}(fromGo api.${i.name}) C.${i.name} {
	return C.${i.name}{
		${propsC},
	}
}
	`;
};

const enumMapper = (s: StructType): string => {
  const propsGo = s.properties
    .map((p, i) => `if *fromC == ${i} { return "${p.name}" }`)
    .join("\n  ");

  const propsC = s.properties
    .map((p, i) => `if fromGo == "${p.name}" { return ${i} }`)
    .join("\n  ");

  return `
func Go${s.name}(fromC *C.${s.name}) api.${s.name} {
  ${propsGo}

  panic(fmt.Sprintf("Unknown ordinal for ${s.name}: %d", *fromC))
}

func C${s.name}(fromGo api.${s.name}) C.${s.name} {
  ${propsC}

  panic(fmt.Sprintf("Unknown value for ${s.name}: %s", fromGo))
}
	`;
};

const propFromC = (v: VarType): string => {
  return `${firstLetterUpperCase(v.name)}: ${paramToGo(
    v.type,
    `fromC.${v.name}`
  )}`;
};

const propFromGo = (v: VarType): string => {
  return `${v.name}: ${paramToC(
    v.type,
    `fromGo.${firstLetterUpperCase(v.name)}`
  )}`;
};

const propFromGoPointer = (v: VarType): string => {
  return `${v.name}: ${paramToC(
    v.type,
    `fromGo.${firstLetterUpperCase(v.name)}`,
    true
  )}`;
};

const structToC = (s: StructType): string => {
  const props = s.properties.map(propToC).join(";\n  ");

  return `
typedef struct ${s.name} {
  ${props};
} ${s.name};
	`;
};

const enumToC = (s: StructType): string => {
  const props = s.properties.map((p) => p.name).join(",\n  ");

  return `	  
typedef enum ${s.name} {
  ${props}
} ${s.name};
		  `;
};

const propToC = (v: VarType): string => {
  const result = `${typeToC(v.type)} ${v.name}`;

  if (v.type.endsWith("[]")) {
    return `${result}; size_t ${v.name}_length`;
  }

  return result;
};

const funcToGo = (
  i: InterfaceType,
  f: FunctionType,
  special: Special
): string => {
  const iface = firstLetterToLowerCase(i.name);
  const func = firstLetterUpperCase(f.name);
  const cfunc = `${firstLetterUpperCase(i.name)}_${firstLetterUpperCase(
    f.name
  )}`;
  const fiface = firstLetterToLowerCase(f.returnType);
  const paramHandle = i.handle ? ["handle int64"] : [];
  const closer =
    f.params.length === 1 &&
    special.handle.includes(f.params[0].type) &&
    f.returnType === "void";
  const ciface = closer ? firstLetterToLowerCase(f.params[0].type) : "";
  const paramsIn = closer
    ? ["handle int64"]
    : f.params.map((p) => `${p.name} ${typeToCgo(p.type)}`);
  const paramsOut = closer
    ? [`${ciface}_handles[handle]`]
    : f.params.map((p) => paramToGo(p.type, p.name));
  const obj = i.handle ? `${iface}_handles[handle]` : i.fold ? "folded" : iface;
  const cleanup = closer ? `\n  ${ciface}_handles[handle] = nil` : "";

  const returnsNew = [];

  if (special.handle.includes(f.returnType)) {
    returnsNew.push(
      `${fiface}_handles = append(${fiface}_handles, ${obj}.${func}(${paramsOut}))`
    );
    returnsNew.push(`return int64(len(${fiface}_handles) - 1)`);
  } else if (f.returnOptional || f.throws) {
    const vars = [];
    if (f.returnType !== "void") {
      vars.push("result");
    }
    if (f.returnOptional) {
      vars.push("ok");
    }
    if (f.throws) {
      vars.push("err");
    }

    returnsNew.push(`${vars.join(", ")} := ${obj}.${func}(${paramsOut})`);

    if (f.returnOptional) {
      returnsNew.push(`if ok { *cok = 1 }`);
    }
    if (f.throws) {
      returnsNew.push(`if err != nil { *cerr = C.CString(err.Error()) }`);
    }
    if (f.returnType !== "void") {
      returnsNew.push(returnToC(f.returnType, "result"));
    }
  } else {
    returnsNew.push(returnToC(f.returnType, `${obj}.${func}(${paramsOut})`));
  }
  const returns = returnsNew.join("\n  ");

  const returnType = special.handle.includes(f.returnType)
    ? `int64`
    : special.fold.includes(f.returnType)
    ? `api.${f.returnType}`
    : typeToCgo(f.returnType);
  const paramsFolded = i.fold ? special.folded[i.name].params : [];
  const folded = i.fold ? `${special.folded[i.name].returnType}\n` : "";

  const newParams = [];
  if (f.returnOptional) {
    newParams.push("cok *C.short");
  }
  if (f.throws) {
    newParams.push("cerr **C.char");
  }

  if (special.fold.includes(f.returnType)) {
    const multi = Object.hasOwn(special.folded, i.name);
    const params = multi ? special.folded[i.name].params : paramHandle;
    const ret = multi
      ? special.folded[i.name].returnType + "."
      : `folded := ${obj}.`;

    special.folded[f.returnType] = {
      params: [...params, ...paramsIn],
      returnType: `${ret}${func}(${paramsOut})`,
    };
    return "";
  }

  const allParams = [
    ...paramsFolded,
    ...paramHandle,
    ...paramsIn,
    ...newParams,
  ].join(", ");

  return `//export ${cfunc}
func ${cfunc}(${allParams}) ${returnType} {
	${folded}${returns}${cleanup}
}`;
};

const paramToGo = (type: string, name: string): string => {
  if (type === "boolean") {
    return `bool(${name} == 1)`;
  }
  if (type === "number") {
    return `float64(${name})`;
  }
  if (type === "bigint") {
    return `int64(${name})`;
  }
  if (type === "string") {
    return `C.GoString(${name})`;
  }
  if (type === "string[]") {
    return `GoStringSlice(${name}, int(${name}_length))`;
  }
  if (type === "Uint8Array") {
    return `C.GoBytes(unsafe.Pointer(${name}), C.int(C.strlen(${name})))`;
  }

  if (type.startsWith("[")) {
    throw new Error(`Tuples not supported: ${type}`);
  }
  if (type[0] === type[0].toLowerCase()) {
    throw new Error(`Unknown type: ${type}`);
  }

  if (type.endsWith("[]")) {
    return `GoMapSlice(${name}, int(${name}_length), Go${type.substring(
      0,
      type.length - 2
    )})`;
    //return `[]api.${type.substring(0, type.length - 2)}{} /*TODO*/`;
  }

  return `Go${type}(&${name})`;
};

const paramToC = (type: string, value: string, pointer?: boolean): string => {
  if (type === "boolean") {
    return `CBool(${value})`;
  }
  if (type === "number") {
    return `C.double(${value})`;
  }
  if (type === "bigint") {
    return `C.longlong(${value})`;
  }
  if (type === "string") {
    return `C.CString(${value})`;
  }
  if (type === "string[]") {
    return `CStringSlice(${value})`;
  }
  if (type === "Uint8Array") {
    return `(*C.char)(C.CBytes(${value}))`;
  }
  if (type === "void") {
    return value;
  }

  if (type.startsWith("[")) {
    throw new Error(`Tuples not supported: ${type}`);
  }
  if (type[0] === type[0].toLowerCase()) {
    throw new Error(`Unknown type: ${type}`);
  }

  if (type.endsWith("[]")) {
    return `CMapSlice(${value}, C${type.substring(0, type.length - 2)})`;
  }

  return `${pointer ? "&" : ""}C${type}(${value})`;
};

const returnToC = (type: string, value: string): string => {
  if (type === "boolean") {
    return `return CBool(${value})`;
  }
  if (type === "number") {
    return `return C.double(${value})`;
  }
  if (type === "bigint") {
    return `return C.longlong(${value})`;
  }
  if (type === "string") {
    return `return C.CString(${value})`;
  }
  if (type === "string[]") {
    return "TODO";
  }
  if (type === "Uint8Array") {
    return `return (*C.char)(C.CBytes(${value}))`;
  }
  if (type === "void") {
    return value;
  }

  if (type.startsWith("[")) {
    throw new Error(`Tuples not supported: ${type}`);
  }
  if (type[0] === type[0].toLowerCase()) {
    throw new Error(`Unknown type: ${type}`);
  }

  return `return C${type}(${value})`;
};

const typeToCgo = (type: string): string => {
  if (type === "boolean") {
    return "C.short";
  }
  if (type === "number") {
    return "C.double";
  }
  if (type === "bigint") {
    return "C.longlong";
  }
  if (type === "string") {
    return "*C.char";
  }
  if (type === "string[]") {
    return "**C.char";
  }
  if (type === "Uint8Array") {
    return "*C.char";
  }
  if (type === "void") {
    return "";
  }

  if (type.startsWith("[")) {
    throw new Error(`Tuples not supported: ${type}`);
  }
  if (type[0] === type[0].toLowerCase()) {
    throw new Error(`Unknown type: ${type}`);
  }

  return `C.${type}`;
};

const typeToC = (type: string): string => {
  if (type === "boolean") {
    return "short";
  }
  if (type === "number") {
    return "double";
  }
  if (type === "bigint") {
    return "longlong";
  }
  if (type === "string") {
    return "char*";
  }
  if (type === "string[]") {
    return "char**";
  }
  if (type === "Uint8Array") {
    return "char*";
  }
  if (type === "void") {
    return "";
  }

  if (type.startsWith("[")) {
    throw new Error(`Tuples not supported: ${type}`);
  }
  if (type[0] === type[0].toLowerCase()) {
    throw new Error(`Unknown type: ${type}`);
  }

  if (type.endsWith("[]")) {
    return `${type.substring(0, type.length - 2)}*`;
  }

  return type;
};

// return byte array: https://stackoverflow.com/questions/70531497/how-to-return-a-byte-slice-in-go-to-c
