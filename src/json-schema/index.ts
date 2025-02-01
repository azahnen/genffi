import * as TJS from "typescript-json-schema";

import { Result } from "../common/io.js";

export type SchemaResult = Result & { obj: any; namespaces: string[] };

export const generateJsonSchema = (
  name: string,
  source: string,
  fileName: string = "schema"
): SchemaResult => {
  const schema = generate(source);

  return {
    name,
    obj: schema.js,
    namespaces: schema.namespaces,
    files: [{ path: `${fileName}.json`, content: schema.string }],
  };
};

export const validationKeywordsBoolean = [
  "hide",
  "optional",
  "interface",
  "javaContextInit",
];
export const validationKeywordsString = ["discriminator"];

const generate = (source: string) => {
  // optionally pass argument to schema generator
  const settings: TJS.PartialArgs = {
    required: true,
    noExtraProps: true,
    //id: "Xtracfg",
    validationKeywords: [
      ...validationKeywordsBoolean,
      ...validationKeywordsString,
    ],
    ref: true,
    aliasRef: true,
    //titles: true,
    //constAsEnum: true,
  };

  // optionally pass ts compiler options
  const compilerOptions = {
    strictNullChecks: true,
  };

  const program = TJS.getProgramFromFiles([source], compilerOptions, "./");

  const generator = TJS.buildGenerator(program, settings);

  if (!generator) {
    throw new Error("Failed to create schema generator");
  }

  const symbols = generator
    .getMainFileSymbols(program)
    .filter((s) => s.startsWith("Ts2xModel."));
  //.getUserSymbols()
  //.filter((s) => !s.endsWith("_1") && s.startsWith("Ts2xModel."));

  const schema = generator.getSchemaForSymbols(symbols, true, true);

  const namespaces = Array.from(
    new Set(
      symbols
        .filter((s) => s.split(".").length >= 3)
        .map((s) => s.split(".")[1])
    )
  );

  const fixedSchema = fix(schema, namespaces);

  return {
    js: fixedSchema,
    string: JSON.stringify(fixedSchema, null, 2),
    namespaces,
  };
};

const fix = (schema: TJS.Definition, namespaces: string[]) => {
  const definitions = schema.definitions || {};
  const newDefinitions: { [key: string]: any } = {};
  namespaces.forEach((ns) => {
    newDefinitions[ns] = {};
  });

  for (const [key, value] of Object.entries(definitions)) {
    const key2 = key.replace("Ts2xModel.", "");
    handleKey(key2, value, newDefinitions, namespaces);
  }

  const newSchema = { ...schema, definitions: newDefinitions };

  return JSON.parse(
    JSON.stringify(newSchema)
      .replaceAll("Ts2xModel.", "")
      .replaceAll(new RegExp(`(${namespaces.join("|")})\\.`, "g"), "$1/")
      .replaceAll("_1", "")
  );
};

function handleKey(
  key: string,
  value: any,
  newDefinitions: any,
  namespaces: string[]
) {
  let handled = false;

  for (const namespace of namespaces) {
    if (key.startsWith(`${namespace}.`)) {
      newDefinitions[namespace][key.replace(`${namespace}.`, "")] = value;
      handled = true;
      break;
    }
  }

  if (!handled) {
    newDefinitions[key] = value;
  }
}
