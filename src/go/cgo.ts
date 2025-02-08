import {
  ApiType,
  FunctionType,
  InterfaceType,
  StructType,
  VarType,
} from "../common/api.ts";
import { typeToC } from "../common/c.ts";
import { Generator } from "../common/index.ts";
import { Result } from "../common/io.ts";
import {
  BridgeMapping,
  typeToLang,
  valueToLang,
  funcToLang,
  Special,
} from "../common/lang.ts";
import {
  firstLetterToLowerCase,
  firstLetterUpperCase,
} from "../common/schema.ts";
import { generateFile } from "./shared.ts";

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

export const generateClib =
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

${util}
    `;

    return code;
  };

const util = `
//TODO: replace with GoMapSlice
func GoStringSlice(array **C.char, length int) []string {
	slice := make([]string, 0, length)
	for _, v := range unsafe.Slice(array, length) {
		slice = append(slice, C.GoString(v))
	}
	return slice
}

//TODO: free in c
//TODO: replace with CMapSlice
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

export const intfaceToGo =
  (special: Special) =>
  (i: InterfaceType): string => {
    const funcs = i.functions.map((f) => funcToGo(i, f, special)).join("\n\n");

    return `
//=== ${i.name} ===

${funcs}
`;
  };

export const intfaceToVar = (i: InterfaceType): string => {
  return `var ${firstLetterToLowerCase(i.name)} api.${i.name}`;
};

export const intfaceToGetter = (i: InterfaceType): string => {
  return `${firstLetterUpperCase(i.name)}() api.${firstLetterUpperCase(
    i.name
  )}`;
};

export const intfaceToInit = (i: InterfaceType): string => {
  return `${firstLetterToLowerCase(i.name)} = init.${firstLetterUpperCase(
    i.name
  )}()`;
};

export const intfaceToHandles = (i: InterfaceType): string => {
  return `var ${firstLetterToLowerCase(i.name)}_handles []api.${i.name}`;
};

export const structMapper = (i: StructType): string => {
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

export const enumMapper = (s: StructType): string => {
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

export const propFromC = (v: VarType): string => {
  return `${firstLetterUpperCase(v.name)}: ${valueToGo(
    v.type,
    `fromC.${v.name}`
  )}`;
};

export const propFromGo = (v: VarType): string => {
  return `${v.name}: ${valueToCgoParam(
    v.type,
    `fromGo.${firstLetterUpperCase(v.name)}`
  )}`;
};

export const propFromGoPointer = (v: VarType): string => {
  return `${v.name}: ${valueToCgoParam(
    v.type,
    `fromGo.${firstLetterUpperCase(v.name)}`,
    true
  )}`;
};

export const structToC = (s: StructType): string => {
  const props = s.properties.map(propToC).join(";\n  ");

  return `
typedef struct ${s.name} {
  ${props};
} ${s.name};
	`;
};

export const enumToC = (s: StructType): string => {
  const props = s.properties.map((p) => p.name).join(",\n  ");

  return `	  
typedef enum ${s.name} {
  ${props}
} ${s.name};
		  `;
};

export const propToC = (v: VarType): string => {
  const result = `${typeToC(v.type)} ${v.name}`;

  if (v.type.endsWith("[]")) {
    return `${result}; size_t ${v.name}_length`;
  }

  return result;
};

const cgoToGoBridge: BridgeMapping = {
  handle: "handle int64",
  closer: "void",
  paramIn: (p: VarType) => `${p.name} ${typeToCgo(p.type)}`,
  paramOut: (p: VarType) => valueToGo(p.type, p.name),
  handles: (type: string) => `${type}_handles`,
  handleValue: (type: string) => `${type}_handles[handle]`,
  typeToName: (type: string) => firstLetterToLowerCase(type),
  cleanup: (handle: string) => `\n  ${handle} = nil`,
  wrapper: (iname: string, fname: string) =>
    `${firstLetterUpperCase(iname)}_${firstLetterUpperCase(fname)}`,
  wrapped: (iname: string, fname: string) => `${firstLetterUpperCase(fname)}`,
  folded: (obj: string) => `folded.${obj}`,
  obj(type: string, handle: boolean, fold: boolean) {
    const name = this.typeToName(type);
    return handle ? `${name}_handles[handle]` : fold ? "folded" : name;
  },
  call: (obj: string, func: string, params: string[]) =>
    `${obj}.${func}(${params})`,
  body1(handleType: string, obj: string, func: string, params: string[]) {
    const handleName = this.typeToName(handleType);
    const handle = this.call(obj, func, params);
    return [
      `${handleName}_handles = append(${handleName}_handles, ${handle})`,
      `return int64(len(${handleName}_handles) - 1)`,
    ];
  },
  body2(f: FunctionType, obj: string, func: string, params: string[]) {
    const returnsNew = [];
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

    const handle = this.call(obj, func, params);
    returnsNew.push(`${vars.join(", ")} := ${handle}`);

    if (f.returnOptional) {
      returnsNew.push(`if ok { *cok = 1 }`);
    }
    if (f.throws) {
      returnsNew.push(`if err != nil { *cerr = C.CString(err.Error()) }`);
    }
    if (f.returnType !== "void") {
      returnsNew.push(valueToCgoReturn(f.returnType, "result"));
    }
    return returnsNew;
  },
  body3(handleType: string, obj: string, func: string, params: string[]) {
    return [valueToCgoReturn(handleType, this.call(obj, func, params))];
  },
  paramRet: (f: FunctionType) => {
    const newParams = [];
    if (f.returnOptional) {
      newParams.push("cok *C.short");
    }
    if (f.throws) {
      newParams.push("cerr **C.char");
    }
    return newParams;
  },
  return: (type: string, handle: boolean, fold: boolean) =>
    handle ? `int64` : fold ? `api.${type}` : typeToCgo(type),
  funcDef: (
    name: string,
    params: string,
    returns: string,
    body: string
  ) => `//export ${name}
	func ${name}(${params}) ${returns} {
		${body}
	}`,
};

export const funcToGo = (
  i: InterfaceType,
  f: FunctionType,
  special: Special
): string => funcToLang(i, f, special, cgoToGoBridge);

export const valueToGo = (type: string, value: string): string => {
  return valueToLang(
    type,
    value,
    "",
    {
      boolean: (value) => `bool(${value} == 1)`,
      number: (value) => `float64(${value})`,
      bigint: (value) => `int64(${value})`,
      string: (value) => `C.GoString(${value})`,
      Uint8Array: (value) =>
        `C.GoBytes(unsafe.Pointer(${value}), C.int(C.strlen(${value})))`,
      void: (value) => value,
    },
    (type: string, value: string) =>
      `GoMapSlice(${value}, int(${value}_length), Go${type})`,
    //return `[]api.${type.substring(0, type.length - 2)}{} /*TODO*/`;
    (type: string, value: string) => `Go${type}(&${value})`
  );
};

export const valueToCgoParam = (
  type: string,
  value: string,
  pointer?: boolean
): string => valueToCgo(type, value, "", pointer);

export const valueToCgoReturn = (type: string, value: string): string =>
  valueToCgo(type, value, "return ");

export const valueToCgo = (
  type: string,
  value: string,
  prefix: string,
  pointer?: boolean
): string => {
  return valueToLang(
    type,
    value,
    prefix,
    {
      boolean: (value) => `CBool(${value})`,
      number: (value) => `C.double(${value})`,
      bigint: (value) => `C.longlong(${value})`,
      string: (value) => `C.CString(${value})`,
      Uint8Array: (value) => `(*C.char)(C.CBytes(${value}))`,
      void: (value) => value,
    },
    (type: string, value: string) => `CMapSlice(${value}, C${type})`,
    (type: string, value: string) => `${pointer ? "&" : ""}C${type}(${value})`
  );
};

export const typeToCgo = (type: string): string => {
  return typeToLang(
    type,
    {
      boolean: "C.short",
      number: "C.double",
      bigint: "C.longlong",
      string: "*C.char",
      Uint8Array: "*C.char",
      void: "",
    },
    (type: string) => `*${type}`,
    (type: string) => `C.${type}`
  );
};

// return byte array: https://stackoverflow.com/questions/70531497/how-to-return-a-byte-slice-in-go-to-c
