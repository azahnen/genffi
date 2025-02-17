import {
  ApiType,
  FunctionType,
  InterfaceType,
  StructType,
  VarType,
} from "../common/api.ts";
import { Generator } from "../common/index.ts";
import { Result } from "../common/io.ts";
import { firstLetterUpperCase } from "../common/schema.ts";
import { go } from "./lang.ts";
import { funcHeader, generateFile } from "./shared.ts";

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
  const funcs = i.functions.map(funcHeader).join("\n  ");

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
