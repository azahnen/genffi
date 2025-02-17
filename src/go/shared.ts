import { Result } from "../common/io.js";
import { Generator } from "../common/index.js";
import { FunctionType } from "../common/api.ts";
import { firstLetterUpperCase } from "../common/schema.ts";
import { go } from "./lang.ts";

export const getName = (
  name: string,
  ns?: string,
  filePrefixes?: Record<string, string>
) => {
  return ns && filePrefixes && filePrefixes[ns]
    ? `${filePrefixes[ns]}${name.toLowerCase()}`
    : name.toLowerCase();
};

export const generateFile = (
  name: string,
  ns: string,
  pkg: string,
  filePrefixes: Record<string, string>,
  generate: Generator
) => {
  const dir = pkg.replaceAll(".", "/");
  const file = getName(name, ns, filePrefixes);
  const code = generate(getName(name), lastElem(pkg));

  return { path: `${dir}/${file}.go`, content: code };
};

const lastElem = (path: string) => {
  const parts = path.split("/");
  return parts[parts.length - 1];
};

export const funcHeader = (f: FunctionType): string => {
  return funcHeaderPkg(f);
};

export const funcHeaderPkg = (f: FunctionType, apiPkg?: string): string => {
  const params = f.params
    .map((p) => `${p.name} ${go.type(p.type, apiPkg)}`)
    .join(", ");

  const ret = [];

  if (f.returnType !== "void") {
    ret.push(go.type(f.returnType, apiPkg));
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
