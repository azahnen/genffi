import { Definition } from "typescript-json-schema";

import {
  validationKeywordsBoolean,
  validationKeywordsString,
} from "../json-schema/index.js";

export const generateJsValidators = (
  schema: Definition,
  name: string,
  fileName: string = "validate"
) => {
  const code = generateValidators(schema);

  return {
    name,
    files: [{ path: `${fileName}.ts`, content: code }],
  };
};

const generateValidators = (schema: Definition) => {
  const definitions = schema.definitions || {};

  let code = `
import { Ajv, ValidateFunction } from "ajv";
import schema from "./schema.json" assert { type: "json" };
import { ${Object.keys(definitions).join(", ")} } from "../index.ts";

const ajv = new Ajv();
ajv.addSchema(schema);
  `;

  for (const keyword of validationKeywordsBoolean) {
    code += `
ajv.addKeyword({keyword: "${keyword}", type: "boolean"});`;
  }
  for (const keyword of validationKeywordsString) {
    code += `
ajv.addKeyword({keyword: "${keyword}", type: "string"});`;
  }

  code += `

const validate = (
  validator: ValidateFunction,
  data: any,
  type: string = "object"
) => {
  const valid = validator(data);

  if (!valid) {
    const message = "not a valid " + type;
    const cause: string[] = [];

    for (const error of validator.errors || []) {
      if (error.keyword === "additionalProperties") {
        cause.push(
          \`unexpected property '\${error.params.additionalProperty}' in \${
            error.instancePath || "root"
          }\`
        );
      } else {
        cause.push(JSON.stringify(error, null, 2));
      }
    }

    throw new Error(message, { cause });
  }
};

const getSchema = (ref: string): ValidateFunction => {
  const schema = ajv.getSchema(ref);

  if (!schema) {
    throw new Error(\`schema not found: \${ref}\`);
  }

  return schema;
};

const validators: { [key: string]: ValidateFunction } = {
  `;

  for (const [ns, entries] of Object.entries(definitions)) {
    for (const [key, def] of Object.entries(entries)) {
      code += `
  '${ns}/${key}': getSchema("#/definitions/${ns}/${key}"),
        `;
    }
  }

  code += `
};

        `;

  for (const [ns, entries] of Object.entries(definitions)) {
    for (const [key, def] of Object.entries(entries)) {
      code += `
export const validate${ns}${key} = (data: any) => validate(validators['${ns}/${key}'], data, '${ns}.${key}');
              `;
    }
  }

  for (const [ns, entries] of Object.entries(definitions)) {
    if (ns !== "Command") {
      continue;
    }
    code += `
export const validate${ns} = (data: ${ns}.Base) => {
            `;
    for (const [key, def] of Object.entries(entries)) {
      if (key === "Base") {
        continue;
      }
      code += `
  if (data instanceof ${ns}.${key}) {validate${ns}${key}(data); return;}
              `;
    }

    code += `
  throw new Error("invalid Command");
};
            `;
  }

  return code;
};
