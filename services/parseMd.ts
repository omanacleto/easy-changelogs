/**
 * Tranforma tokens de markdown em HTML.
 * @param text
 * @returns
 */
export default function parseMd(text: string): string {
 let failSafe = 0;
 let result = null;

 text = text.replace(/\n/g, "<br />");

 // negrito
 do {
  failSafe += 1;
  result = /(\*)(.*?)(\*)/g.exec(text);
  if (result) {
   text = text.replace(result[0], `<b>${result[2]}</b>`);
  }
 } while (result && failSafe < 50);

 failSafe = 0;
 result = null;

 // itálico
 do {
  failSafe += 1;
  result = /(_)(.*?)(_)/g.exec(text);
  if (result) {
   text = text.replace(result[0], `<i>${result[2]}</i>`);
  }
 } while (result && failSafe < 50);

 failSafe = 0;
 result = null;

 // links
 do {
  failSafe += 1;
  result = /(\^)(.*?)(\^)/g.exec(text);

  if (result) {
   const [label, url] = result[2].split("|");
   text = text.replace(result[0], `<a class="text-blue-600 dark:text-blue-500 hover:underline" href="${url}" target="_blank">${label}</a>`);
  }
 } while (result && failSafe < 50);

 return text;
}
