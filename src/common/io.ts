import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export type File = { path: string; content: string };

export type Result = { name: string; files: File[] };

export const write = (
  result: Result,
  basePath: string,
  verbose?: boolean
): boolean => {
  let noChanges = true;
  const messages = [];

  for (const { path, content } of result.files) {
    const fullPath = `${basePath}/${path}`;
    const oldContent = existsSync(fullPath)
      ? readFileSync(fullPath, "utf8")
      : "";

    if (oldContent === content) {
      if (verbose) messages.push(`  - ${path}: NO CHANGES`);
      continue;
    }

    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    noChanges = false;

    if (verbose) messages.push(`  - ${path}: UPDATED`);
  }

  console.log(`- ${result.name}: ${noChanges ? "NO CHANGES" : "UPDATED"}`);
  messages.forEach((msg) => console.log(msg));

  return noChanges;
};
