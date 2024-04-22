/**
 * Retrieves query values from url, and returns them as an object.
 * @param url The url to retrieve the query values from.
 * @returns An object containing the query values.
 */
export default function getQuery(url: string): { [key: string]: string } {
 const obj: { [key: string]: string } = {};
 const urlObject = new URL(url);
 urlObject.searchParams.forEach((value, key: string) => {
  obj[key] = value;
  return obj;
 });

 return obj;
}
