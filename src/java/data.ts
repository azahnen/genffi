import { Definition, DefinitionOrBoolean } from "typescript-json-schema";
import {
  DataType,
  Defs,
  defs,
  getDefault,
  getType,
  getValue,
  isConst,
  isEnum,
} from "../common/schema.js";
import { Generator } from "../common/index.js";

const identifiersPrefix = "Identifiers.";

const getLanguageTypeJava = (type: DataType, innerType?: string): string => {
  switch (type) {
    case DataType.STRING:
      return "String";
    case DataType.NUMBER:
      return "Double";
    case DataType.INTEGER:
      return "Integer";
    case DataType.BOOLEAN:
      return "Boolean";
    case DataType.OBJECT:
      return "java.util.Map<String, Object>";
    case DataType.ARRAY:
      return `java.util.List<${innerType || "Object"}>`;
    case DataType.OPTIONAL:
      return `java.util.Optional<${innerType || "Object"}>`;
    default:
      return "String";
  }
};

export const generateDataRecord =
  (schema: Definition, suffixNs: string[] = [], intface?: string): Generator =>
  (name: string, pkg: string): string => {
    const properties = schema.properties || {};
    const props = defs(properties);
    const toType = (entry: Definition) =>
      getType(entry, getLanguageTypeJava, suffixNs, identifiersPrefix);

    let code = `
package ${pkg};

public record ${name}(`;
    let i = 0;
    for (const [key, entry] of props) {
      i++;
      if (isConst(entry)) {
        continue;
      }
      const comma = i <= Object.keys(properties).length - 1 ? "," : "";
      code += `
    ${toType(entry)} ${key}${comma}`;
    }

    code += `
  )${intface ? ` implements ${intface}` : ""} {

public ${name}(`;
    let j = 0;
    for (const [key, entry] of props) {
      j++;
      if (isConst(entry)) {
        continue;
      }
      const comma = j <= Object.keys(properties).length - 1 ? "," : "";
      code += `
  ${toType(entry)} ${key}${comma}`;
    }

    code += `
) {`;
    for (const [key, entry] of props) {
      if (isConst(entry)) {
        /*code += `
  this.${key} = ${getValue(entry)};`;*/
        continue;
      }
      if (Object.hasOwn(entry, "default")) {
        code += `
  this.${key} = java.util.Objects.requireNonNullElse(${key},${getDefault(
          entry
        )});`;
      } else {
        code += `
  this.${key} = ${key};`;
      }
    }

    code += `
}
  `;

    for (const [key, entry] of props) {
      if (isConst(entry)) {
        code += `
public ${toType(entry)} ${key}() {
  return ${getValue(entry, identifiersPrefix)};
}
`;
      }
    }

    code += `
}

`;

    return code;
  };

export const generateDataClass =
  (schema: Definition, suffixNs: string[] = [], intface?: string): Generator =>
  (name: string, pkg: string): string => {
    const properties = schema.properties || {};
    const props = defs(properties);
    const toType = (entry: Definition) =>
      getType(entry, getLanguageTypeJava, suffixNs, identifiersPrefix);

    let code = `
package ${pkg};

public class ${name}${intface ? ` implements ${intface}` : ""} {
  `;
    for (const [key, entry] of props) {
      code += `
private final ${toType(entry)} ${key};`;
    }

    code += `

public ${name}(`;
    let i = 0;
    for (const [key, entry] of props) {
      i++;
      if (isConst(entry)) {
        continue;
      }
      const comma = i <= Object.keys(properties).length - 1 ? "," : "";
      code += `
  ${toType(entry)} ${key}${comma}`;
    }

    code += `
) {`;
    for (const [key, entry] of props) {
      if (isConst(entry)) {
        code += `
  this.${key} = ${getValue(entry, identifiersPrefix)};`;
        continue;
      }
      if (Object.hasOwn(entry, "default")) {
        code += `
  this.${key} = java.util.Objects.requireNonNullElse(${key},${getDefault(
          entry
        )});`;
      } else {
        code += `
  this.${key} = ${key};`;
      }
    }

    code += `
}
  `;
    for (const [key, entry] of props) {
      code += `
public ${toType(entry)} ${key}() {
  return ${key};
}
  `;
    }

    code += `
}

  `;

    return code;
  };

export const generateInterface =
  (
    schema: Definition,
    suffixNs: string[],
    discriminators: { [key: string]: string },
    discriminatorKey?: string
  ): Generator =>
  (name: string, pkg: string): string => {
    const properties = schema.properties || {};
    const toType = (entry: DefinitionOrBoolean) =>
      getType(entry, getLanguageTypeJava, suffixNs, identifiersPrefix);

    let code = `
package ${pkg};
  `;

    if (discriminatorKey) {
      code += `
import shadow.com.fasterxml.jackson.annotation.JsonSubTypes;
import shadow.com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "${discriminatorKey}", visible = true)
@JsonSubTypes({`;
      for (const [key, value] of Object.entries(discriminators)) {
        code += `
          @JsonSubTypes.Type(value = ${key}.class, name = "${value}"),`;
      }

      code += `
})`;
    }

    code += `
public interface ${name} {
  `;
    for (const [key, entry] of Object.entries(properties)) {
      code += `
${toType(entry)} ${key}();
  `;
    }

    code += `
}
  `;

    return code;
  };

export const generateIdentifiersClass =
  (consts: Defs, enums: Defs, suffixNs: string[]): Generator =>
  (name: string, pkg: string): string => {
    //const properties = schema.properties || {};
    const toType = (entry: Definition) =>
      getType(entry, getLanguageTypeJava, suffixNs, identifiersPrefix);

    let code = `
package ${pkg};

public interface ${name} {
    `;
    for (const [key, entry] of consts) {
      if (!isConst(entry)) {
        continue;
      }
      code += `
  ${toType(entry)} ${key} = ${getValue(entry)};`;
    }

    code += `
`;

    for (const [key, entry] of enums) {
      if (!isEnum(entry)) {
        continue;
      }
      code += `
  enum ${key} { ${entry["enum"]?.join(", ")} };`;
    }

    code += `
}
`;

    return code;
  };
