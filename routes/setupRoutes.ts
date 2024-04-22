import { readdir } from "node:fs/promises";

export async function setupRoutes() {
 // read all the files in the current directory
 const files = await readdir(import.meta.dir);

 // import all the files
 for (const file of files) {
  if (file.endsWith(".ts") && file !== "setupRoutes.ts") {
   await import(`./${file}`);
  }
 }
}
