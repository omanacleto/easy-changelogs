import { app } from "..";
import { createHmac } from "crypto";
import {
 getConfiguration,
 initializeDatabase,
 setConfiguration,
 releaseVersion,
 deleteVersion,
 isVersionEmpty,
} from "../database";
import getQuery from "../services/getQuery";
import validateSecret from "../services/validateSecret";

// retrieve settings page
app.get("/", async (req, res) => {
 await initializeDatabase();

 const { secret } = getQuery(req.url);
 const valid = await validateSecret(secret);
 if (!valid) return res.status(401).send("invalid_secret");

 const html = Bun.file("./frontend/index.html");
 res.setHeader("content-type", "text/html").status(200).send(html);
});

// retrieve configuration
app.get("/settings", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const configuration = await getConfiguration();

 const currentSecret = await Bun.file("./secret.txt").text();
 configuration.secret = currentSecret;

 return res.status(200).send(configuration);
});

// update settings
app.post("/settings", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const formData = await req.formData();

 const body: { [key: string]: string } = {};
 formData.forEach((value, key) => {
  if (typeof value !== "string") return;
  body[key] = value as string;
 });

 if (body.secret) {
  const bodySecret = body.secret;
  delete body.secret;
  await Bun.write("./secret.txt", bodySecret);
 }

 const keys = Object.keys(body);

 for (let i = 0; i < keys.length; i++) {
  const configKey = keys[i];
  await setConfiguration(configKey, body[configKey]);
 }

 res.status(200).send("success");
});

app.post("/version/release", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const { version } = getQuery(req.url);

 // if the user tries releasing an empty version, it will be deleted
 if (await isVersionEmpty(version)) await deleteVersion(version);
 else await releaseVersion(version);

 res.status(200).send("success");
});

app.delete("/version", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const { version } = getQuery(req.url);
 await deleteVersion(version);

 res.status(200).send("success");
});
