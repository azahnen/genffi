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
  bridgeToLang,
  Special,
} from "../common/lang.ts";
import {
  firstLetterToLowerCase,
  firstLetterUpperCase,
} from "../common/schema.ts";
import { generateFile } from "./shared.ts";

export const generateGoStubs = (
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

  //TODO: only write if the file does not exist yet
  result.files.push(
    generateFile(
      "gen",
      "",
      pkg,
      filePrefixes,
      generateStubs(api, module, pkg, pkgApi, specialTypes)
    )
  );

  return result;
};

export const generateStubs =
  (
    api: ApiType,
    module: string,
    pkgClib: string,
    pkgApi: string,
    special: Special
  ): Generator =>
  (name: string, pkg: string): string => {
    let code = `package ${pkg}
		
import "fmt"
import api "${module}/${pkgApi}"

${api.interfaces.map(intfaceToGo(special)).join("\n")}

    `;

    return code;
  };

//TODO: detect opener/closer functions?
//TODO: detect that Store is also an interface and has constructor?
export const intfaceToGo =
  (special: Special) =>
  (i: InterfaceType): string => {
    const funcs = i.functions.map((f) => funcToGo(i, f, special)).join("\n\n");

    return `
	//=== ${i.name} ===

type ${i.name} struct {
}

func New${i.name}() *${i.name} {
	return &${i.name}{}
}

func (s *${i.name}) Open(cfg api.StoreCfg) api.Store {
	return NewStore(cfg)
}

// Close implements api.Stores.
func (s *${i.name}) Close(store api.Store) {
}
	
	${funcs}
	`;
  };

export const funcToGo = (
  i: InterfaceType,
  f: FunctionType,
  special: Special
): string => "";
