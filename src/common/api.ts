import * as TJS from "typescript-json-schema";
import * as ts from "typescript";

export type VarType = { name: string; type: string; enum: boolean };

export type FunctionType = {
  name: string;
  params: VarType[];
  returnType: string;
  returnOptional: boolean;
  throws: boolean;
};

export type InterfaceType = {
  name: string;
  singleton: boolean;
  handle: boolean;
  fold: boolean;
  functions: FunctionType[];
};

export type StructType = {
  name: string;
  properties: VarType[];
};

export type ApiType = {
  interfaces: InterfaceType[];
  structs: StructType[];
  enums: StructType[];
};

export const generateApi = (source: string): ApiType => {
  // optionally pass ts compiler options
  const compilerOptions = {
    strictNullChecks: true,
  };

  const program = TJS.getProgramFromFiles([source], compilerOptions, "./");

  return analyze(program as unknown as ts.Program);
};

const analyze = (program: ts.Program): ApiType => {
  const typeChecker = program.getTypeChecker();
  const interfaces: InterfaceType[] = [];
  const structs: StructType[] = [];
  const enums: StructType[] = [];

  function inspect(node: ts.Node, tc: ts.TypeChecker) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const symbol: ts.Symbol = (<any>node).symbol;
      const nodeType = tc.getTypeAtLocation(node);
      const fullyQualifiedName = tc.getFullyQualifiedName(symbol);
      const typeName = fullyQualifiedName.replace(/".*"\./, "");
      const name = typeName;
      if (name.startsWith("Ts2xApi.")) {
        const functions = nodeType
          .getProperties()
          .map((prop) => {
            const propType = tc.getTypeOfSymbolAtLocation(prop, node);
            const propDocTags = prop.getJsDocTags(tc);
            const propTypeName = tc.typeToString(propType);
            //console.log(name, prop.getName(), propTypeName);

            const parsed = parseFunction(
              prop.getName(),
              propTypeName,
              propDocTags,
              enums
            );
            //console.log(parsed);
            //console.log(toC(parsed!));

            return parsed;
          })
          .filter((f) => f !== null);

        const docTags = symbol.getJsDocTags(tc);

        interfaces.push({
          name: name.replace("Ts2xApi.", ""),
          singleton: docTags.some((tag) => tag.name === "singleton"),
          handle: docTags.some((tag) => tag.name === "handle"),
          fold: docTags.some((tag) => tag.name === "fold"),
          functions: functions as FunctionType[],
        });
      }
    } else if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const symbol: ts.Symbol = (<any>node).symbol;
      const nodeType = tc.getTypeAtLocation(node);
      const fullyQualifiedName = tc.getFullyQualifiedName(symbol);
      const typeName = fullyQualifiedName.replace(/".*"\./, "");
      const name = typeName;
      if (name.startsWith("Ts2xApi.")) {
        const props = nodeType
          .getProperties()
          .map((prop) => {
            const propType = tc.getTypeOfSymbolAtLocation(prop, node);
            const propTypeName = tc.typeToString(propType);

            return {
              name: prop.getName(),
              type: propTypeName,
              //TODO: multiple inspect runs, enums first
              enum: enums.find((e) => e.name === propTypeName) !== undefined,
            };
          })
          .filter((f) => f !== null);

        structs.push({
          name: name.replace("Ts2xApi.", ""),
          properties: props,
        });
      }
    } else if (node.kind === ts.SyntaxKind.EnumDeclaration) {
      const symbol: ts.Symbol = (<any>node).symbol;
      const fullyQualifiedName = tc.getFullyQualifiedName(symbol);
      const typeName = fullyQualifiedName.replace(/".*"\./, "");
      const name = typeName;
      if (name.startsWith("Ts2xApi.")) {
        const props: VarType[] = [];

        for (const [key, value] of symbol.exports?.entries() || []) {
          const propDecl = value.valueDeclaration?.getText() || "";
          const propType =
            propDecl.includes("=") && propDecl.includes('"')
              ? "string"
              : "number";
          props.push({ name: key as string, type: propType, enum: false });
        }

        enums.push({
          name: name.replace("Ts2xApi.", ""),
          properties: props,
        });
      }
    } else {
      ts.forEachChild(node, (n) => inspect(n, tc));
    }
  }

  program.getSourceFiles().forEach((sourceFile, _sourceFileIdx) => {
    inspect(sourceFile, typeChecker);
  });

  return { interfaces, structs, enums };
};

const toC = (f: FunctionType): string => {
  const params = f.params
    .map((p) => `const ${toCType(p.type)} ${p.name}`)
    .join(", ");

  return `${toCType(f.returnType)} ${f.name}(${params});`;
};

const toCType = (type: string): string => {
  if (type === "boolean") {
    return "bool";
  }
  if (type === "string") {
    return "char*";
  }
  if (type === "bigint") {
    return "long long int";
  }
  if (type === "Uint8Array") {
    return "char*";
  }
  throw new Error(`Unknown type: ${type}`);
};

const toJavaType = (type: string): string => {
  if (type === "boolean") {
    return "boolean";
  }
  if (type === "string") {
    return "String";
  }
  if (type === "bigint") {
    return "long";
  }
  if (type === "Uint8Array") {
    return "byte[]";
  }
  throw new Error(`Unknown type: ${type}`);
};

const parseFunction = (
  name: string,
  body: string,
  docTags: ts.JSDocTagInfo[],
  enums: StructType[]
): FunctionType | null => {
  const functionRegex = /\(([^)]*)\)\s*=>\s*([^\s]+)/;
  const match = body.match(functionRegex);
  if (match) {
    const params =
      match[1].length === 0
        ? []
        : match[1].split(",").map((param) => {
            const [name, type] = param
              .trim()
              .split(":")
              .map((p) => p.trim());
            return {
              name,
              type,
              //TODO: multiple inspect runs, enums first
              enum: enums.find((e) => e.name === name) !== undefined,
            };
          });
    const returnType = match[2];

    const throws = docTags.some((tag) => tag.name === "throws");
    const returnOptional = docTags.some((tag) => tag.name === "optional");

    return { name, params, returnType, returnOptional, throws };
  }
  return null;
};
