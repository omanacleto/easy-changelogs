/**
 * Check is given secret is the same as on secret.txt
 * @param secret The secret to validate.
 * @returns True if the secret is correct, false otherwise.
 */
export default async function validateSecret(secret: string) {
 try {
  const currentSecret = await Bun.file("./secret.txt").text();
  if (!currentSecret) return true;
  return secret === currentSecret;
 } catch (e) {
  console.log("no_secret_file");
  console.error(e);
  //create file
  await Bun.write("./secret.txt", "secret");
  return secret === "secret";
 }
}
