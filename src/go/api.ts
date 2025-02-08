import {
  ApiType,
  FunctionType,
  InterfaceType,
  StructType,
  VarType,
} from "../common/api.js";
import { Generator } from "../common/index.js";
import { Result } from "../common/io.js";
import { firstLetterUpperCase } from "../common/schema.js";
import { go } from "./lang.ts";
import { generateFile } from "./shared.js";

export const generateGoApi = (
  name: string,
  api: ApiType,
  pkg: string,
  dataNs: string[],
  filePrefixes: Record<string, string> = {}
) => {
  const result: Result = { name, files: [] };

  result.files.push(
    generateFile("gen", "", pkg, filePrefixes, generateApi(api))
  );

  return result;
};

const generateApi =
  (api: ApiType): Generator =>
  (name: string, pkg: string): string => {
    let code = `package ${pkg}  

${api.enums.map(enumToGo).join("\n")}

${api.structs.map(structToGo).join("\n")}

${api.interfaces.map(intfaceToGo).join("\n")}
      `;

    return code;
  };

const intfaceToGo = (i: InterfaceType): string => {
  const funcs = i.functions.map(funcToGo).join("\n  ");

  return `
type ${i.name} interface {
  ${funcs}
}
`;
};

const structToGo = (i: StructType): string => {
  const props = i.properties.map(propToGo).join("\n  ");

  return `
type ${i.name} struct {
  ${props}
}
  `;
};

const enumToGo = (s: StructType): string => {
  const props = s.properties
    .map(
      (p, i) =>
        `${s.name}${p.name} ${s.name} = ${
          p.type === "string" ? `"${p.name}"` : i
        }`
    )
    .join("\n  ");

  return `
type ${s.name} string
	
const (
	${props}
)
		`;
};

const propToGo = (v: VarType): string => {
  return `${firstLetterUpperCase(v.name)} ${go.type(v.type)}`;
};

const funcToGo = (f: FunctionType): string => {
  const params = f.params.map((p) => `${p.name} ${go.type(p.type)}`).join(", ");

  const ret = [];

  if (f.returnType !== "void") {
    ret.push(go.type(f.returnType));
  }
  if (f.returnOptional) {
    ret.push("bool");
  }
  if (f.throws) {
    ret.push("error");
  }

  const ret2 =
    ret.length > 1 ? `(${ret.join(", ")})` : ret.length == 1 ? ret[0] : "";

  return `${firstLetterUpperCase(f.name)}(${params}) ${ret2}`;
};
