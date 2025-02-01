import { Definition, DefinitionOrBoolean } from "typescript-json-schema";

export type Defs = [string, Definition][];

export const constsNs = "Consts";
export const enumsNs = "Enums";
export const constsPath = "/Consts/";
export const enumsPath = "/Enums/";

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  OPTIONAL = "optional",
}

export const defs = (entry: DefinitionOrBoolean): Defs => {
  return typeof entry !== "boolean" ? Object.entries(entry as Definition) : [];
};

export const getType = (
  schema: DefinitionOrBoolean,
  getLanguageType: (type: DataType, innerType?: string) => string,
  suffixNs: string[] = [],
  identifiersPrefix: string = ""
): string => {
  if (typeof schema === "boolean") {
    return getLanguageType(DataType.BOOLEAN);
  }
  if (schema.type) {
    if (schema.type === "object" && !schema.properties) {
      return getLanguageType(DataType.OBJECT);
    }
    if (schema.type === "array" && schema.items) {
      return getLanguageType(
        DataType.ARRAY,
        getType(schema.items as DefinitionOrBoolean, getLanguageType, suffixNs)
      );
    }
    const type =
      schema.type === "integer"
        ? DataType.INTEGER
        : schema.type === "number"
        ? DataType.NUMBER
        : schema.type === "boolean"
        ? DataType.BOOLEAN
        : DataType.STRING;
    if (Object.hasOwn(schema, "optional")) {
      return getLanguageType(DataType.OPTIONAL, getLanguageType(type));
    }
    return getLanguageType(type);
  }
  if (schema.$ref) {
    if (schema.$ref.includes(constsPath)) {
      return getLanguageType(DataType.STRING);
    }
    let type = schema.$ref.substring(schema.$ref.lastIndexOf("/") + 1);
    if (type.includes(".")) {
      type = type.substring(0, type.lastIndexOf("."));
    }
    const prefix = schema.$ref.includes(enumsPath) ? identifiersPrefix : "";
    const suffix =
      suffixNs.find((ns) => type !== ns && schema.$ref?.includes(`/${ns}/`)) ||
      "";
    type = `${prefix}${type}${suffix}`;

    if (Object.hasOwn(schema, "optional")) {
      return getLanguageType(DataType.OPTIONAL, type);
    }
    return type;
  }

  return "";
};

export const getValue = (
  schema: DefinitionOrBoolean,
  prefix: string = "",
  ignoreQualifier?: boolean
): string => {
  if (typeof schema === "boolean") {
    return schema ? "true" : "false";
  }
  if (schema.const) {
    return `"${schema.const}"`;
  }
  if (Object.hasOwn(schema, "hide")) {
    return `null`;
  }
  if (
    schema.$ref &&
    (schema.$ref.includes(constsPath) || schema.$ref.includes(enumsPath))
  ) {
    const name =
      ignoreQualifier && schema.$ref.includes(".")
        ? schema.$ref.substring(schema.$ref.lastIndexOf(".") + 1)
        : schema.$ref.substring(schema.$ref.lastIndexOf("/") + 1);
    return `${prefix}${name}`;
  }
  return "";
};

export const getDefault = (schema: DefinitionOrBoolean): string => {
  if (typeof schema === "object" && Object.hasOwn(schema, "default")) {
    if (schema.type === "string") {
      return `"${schema.default}"`;
    }
    return `${schema.default}`;
  }
  return "";
};

export const isConst = (schema: DefinitionOrBoolean) => {
  return (
    typeof schema === "object" &&
    (Object.hasOwn(schema, "const") ||
      Object.hasOwn(schema, "hide") ||
      (Object.hasOwn(schema, "$ref") &&
        schema.$ref &&
        (schema.$ref.includes(constsPath) ||
          (schema.$ref.includes(enumsPath) && schema.$ref.includes(".")))))
  );
};

export const isEnum = (schema: DefinitionOrBoolean) => {
  return (
    typeof schema === "object" &&
    (Object.hasOwn(schema, "enum") ||
      (Object.hasOwn(schema, "$ref") &&
        schema.$ref &&
        schema.$ref.includes(enumsPath)))
  );
};

export const firstLetterUpperCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const firstLetterToLowerCase = (str: string) => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};
