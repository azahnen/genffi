import { Definition } from "typescript-json-schema";
import { Defs, constsNs, enumsNs, defs, getValue } from "../common/schema.js";
import { Result, File } from "../common/io.js";
import { Generator } from "../common/index.js";
import {
  generateDataRecord,
  generateIdentifiersClass,
  generateInterface,
} from "./data.js";

export type OnNamespace = (
  ns: string,
  nsInterface?: string,
  nsInterfaceDef?: Definition
) => void;

export type OnClass = (ns: string, name: string, def?: any) => void;

export type ClassGenerator = {
  name: string;
  pkg: string;
  codeOrGenerator: string | Generator;
};

export type ClassGenerators = (() => ClassGenerator[]) | ClassGenerator[];

export type Hooks = {
  onNamespace?: OnNamespace;
  onClass?: OnClass;
};

export const generateJava = (
  name: string,
  schema: Definition,
  pkg: string,
  dataNs: string[],
  suffixNs: string[],
  additionalClasses: ClassGenerators = [],
  hooks?: Hooks
): Result => {
  const definitions = schema.definitions || {};
  let consts: Defs = [];
  let enums: Defs = [];
  const result: Result = { name, files: [] };

  for (const [ns, entries] of Object.entries(definitions)) {
    if (ns === constsNs) {
      consts = defs(entries);
      continue;
    }
    if (ns === enumsNs) {
      enums = defs(entries);
      continue;
    }
    let nsInterface: string | undefined;
    let nsInterfaceDef: Definition | undefined;
    let nsDiscriminator: string | undefined;
    let nsDiscriminators: { [key: string]: string } = {};

    for (const [key, def] of Object.entries(entries)) {
      if (dataNs.includes(ns) && def && def.interface) {
        nsInterface = getName(key, ns, suffixNs);
        nsInterfaceDef = def as Definition;
        if (def.discriminator) {
          nsDiscriminator = def.discriminator as string;
        }
      }
    }

    if (hooks && hooks.onNamespace) {
      hooks.onNamespace(ns, nsInterface, nsInterfaceDef);
    }

    for (const [key, def] of Object.entries(entries)) {
      if (dataNs.includes(ns) && def && !def.interface) {
        if (
          nsDiscriminator &&
          def.properties &&
          def.properties[nsDiscriminator]
        ) {
          nsDiscriminators[getName(key, ns, suffixNs)] = getValue(
            def.properties[nsDiscriminator],
            "",
            true
          );
        }

        if (hooks && hooks.onClass) {
          hooks.onClass(ns, getName(key, ns, suffixNs), def);
        }

        result.files.push(
          generateClass(
            getName(key, ns, suffixNs),
            pkg,
            generateDataRecord(def, suffixNs, nsInterface)
          )
        );
      }
    }
    if (nsInterface) {
      result.files.push(
        generateClass(
          nsInterface,
          pkg,
          generateInterface(
            nsInterfaceDef as Definition,
            suffixNs,
            nsDiscriminators,
            nsDiscriminator
          )
        )
      );
    }
  }

  result.files.push(
    generateClass(
      "Identifiers",
      pkg,
      generateIdentifiersClass(consts, enums, suffixNs)
    )
  );

  const classes =
    typeof additionalClasses === "function"
      ? additionalClasses()
      : additionalClasses;

  classes.forEach((cls) => {
    if (typeof cls.codeOrGenerator === "string") {
      result.files.push(toFile(cls.name, cls.pkg, cls.codeOrGenerator));
    } else {
      result.files.push(generateClass(cls.name, cls.pkg, cls.codeOrGenerator));
    }
  });

  return result;
};

const getName = (name: string, ns: string, suffixNs: string[]) => {
  return suffixNs.includes(ns) && name !== ns ? name + ns : name;
};

const generateClass = (
  name: string,
  pkg: string,
  generate: Generator
): File => {
  return toFile(name, pkg, generate(name, pkg));
};

const toFile = (name: string, pkg: string, code: string): File => {
  const dir = pkg.replaceAll(".", "/");

  return { path: `${dir}/${name}.java`, content: code };
};
