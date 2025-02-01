import { ApiType, generateApi, InterfaceType } from "./common/api.js";
import { Result, write } from "./common/io.js";
import { constsNs, enumsNs } from "./common/schema.js";
import {
  generateGoModel,
  generateGoApi,
  generateCgoWrapper,
} from "./go/index.js";
import { ClassGenerators, generateJava, Hooks } from "./java/index.js";
import { generateJsValidators } from "./js/index.js";
import { generateJsonSchema, SchemaResult } from "./json-schema/index.js";

export {
  type Definition,
  type DefinitionOrBoolean,
} from "typescript-json-schema";

export {
  type ClassGenerators,
  type ClassGenerator,
  type Hooks,
  type OnNamespace,
  type OnClass,
} from "./java/index.js";

export { type Generator } from "./common/index.js";
export { write, type File, type Result } from "./common/io.js";

export type GenCfg = {
  basePath: string;
  label?: string;
};

export type GenLangCfg = GenCfg & {
  pkg: string;
};

export type GoPkgCfg = {
  pkg?: string;
};

export type GoApiCfg = GoPkgCfg & {
  cgo?: boolean;
  cgoPkg?: string;
};

export type GoCfg = GenLangCfg & {
  module: string;
  filePrefixes: Record<string, string>;
  model?: GoPkgCfg;
  api?: GoApiCfg;
};

export type JavaCfg = GenLangCfg & {
  classSuffixes?: string[];
  additionalClasses?: ClassGenerators;
  hooks?: Hooks;
};

export type Cfg = {
  source: string;
  go?: GoCfg;
  java?: JavaCfg;
  ts?: GenCfg;
  schema?: GenCfg;
  verbose?: boolean;
};

export const generate = (cfg: Cfg) => {
  console.log("Generating code from TypeScript definitions");

  const { source, verbose, schema: schemaCfg, java, go, ts } = cfg;

  const schema: SchemaResult = generateJsonSchema(
    schemaCfg?.label || "JSON Schema",
    source
  );

  const api: ApiType = generateApi(source);
  console.log("API:", JSON.stringify(api, null, 2));

  if (schemaCfg) {
    write(schema, schemaCfg.basePath, verbose);
  }

  //TODO: do we need dedicated namespaces for consts and enums?
  const dataNs = Array.from(schema.namespaces).filter(
    (ns) => ns !== constsNs && ns !== enumsNs
  );
  //console.log("Data namespaces:", dataNs);

  if (ts) {
    const code: Result = generateJsValidators(
      schema.obj,
      ts.label || "Typescript code"
    );

    write(code, ts.basePath, verbose);
  }

  if (java) {
    const code: Result = generateJava(
      java.label || "Java code",
      schema.obj,
      java.pkg,
      dataNs,
      java.classSuffixes || [],
      java.additionalClasses || [],
      java.hooks
    );

    write(code, java.basePath, verbose);
  }

  if (go) {
    const goPkgPrefix = go.pkg ? `${go.pkg}/` : "";

    if (go.model) {
      const code: Result = generateGoModel(
        go.label || "Go model",
        schema.obj,
        `${goPkgPrefix}${go.model.pkg || "model"}`,
        dataNs,
        go.filePrefixes
      );

      write(code, go.basePath, verbose);
    }

    if (go.api) {
      const code: Result = generateGoApi(
        go.label || "Go API",
        api,
        `${goPkgPrefix}${go.api.pkg || "api"}`,
        [],
        {}
      );

      write(code, go.basePath, verbose);

      if (go.api.cgo) {
        const code: Result = generateCgoWrapper(
          go.label || "Go CGO wrapper",
          api,
          `${goPkgPrefix}${go.api.cgoPkg || "internal/clib"}`,
          `${goPkgPrefix}${go.api.pkg || "api"}`,
          go.module,
          [],
          {}
        );

        write(code, go.basePath, verbose);
      }
    }
  }
};
