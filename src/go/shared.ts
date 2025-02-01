import { Result } from "../common/io.js";
import { Generator } from "../common/index.js";

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
