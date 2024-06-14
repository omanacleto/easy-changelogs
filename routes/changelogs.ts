import { app } from "..";
import { createHmac } from "crypto";
import {
 addChangeLog,
 getChangeLog,
 getConfiguration,
 type ChangeLogAttributes,
 getVersions,
 getUnreleasedVersions,
 getVersion,
 addVersion,
 type VersionAttributes,
 releaseVersion,
 deleteVersion,
 deleteChangeLog,
 isVersionEmpty,
 commitIdentifierExists,
 addCommitIdentifier,
} from "../database";
import getQuery from "../services/getQuery";
import { formatInTimeZone } from "date-fns-tz";
import validateSecret from "../services/validateSecret";
import parseMd from "../services/parseMd";
import { set, setHours } from "date-fns";

// simple mapping to normalize the type of the changelog
const typeMapper: {
 [key: string]: string;
} = {
 feature: "feature",
 feat: "feature",
 fix: "fix",
 bug: "fix",
 deprecation: "deprecated",
 deprecated: "deprecated",
 dep: "deprecated",
};

// retrieve the "New Changelog" page
app.get("/changelog", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 let html = await Bun.file("./frontend/changelog.html").text();

 const configuration = await getConfiguration();

 const featuresLabel = configuration.featuresLabel || "Feature";
 const deprecationsLabel = configuration.deprecationsLabel || "Deprecation";
 const fixesLabel = configuration.fixesLabel || "Fix";
 const versioning = configuration.versioning || "off";

 // replace labeling on html
 html = html
  .replace("[VERSIONING]", versioning || "off")
  .replace("Feature", featuresLabel)
  .replace("Deprecation", deprecationsLabel)
  .replace("Fix", fixesLabel);

 if (versioning === "on") {
  const versionHtml = await Bun.file("./frontend/unreleased-version.html").text();
  const unreleasedVersions = await getUnreleasedVersions();

  let versions = "";

  unreleasedVersions.forEach(({ id }) => {
   versions += versionHtml.replaceAll("[VERSION]", id);
  });

  html = html.replace("[UNRELEASEDVERSIONS]", versions);
 } else html = html.replace("[UNRELEASEDVERSIONS]", "");

 res.setHeader("content-type", "text/html").status(200).send(html);
});

app.get("/changelogs", async (req, res) => {
 const config = await getConfiguration();
 const isLoggedIn = await validateSecret(getQuery(req.url).secret);

 const logs = await getChangeLog();
 const log = await Bun.file("./frontend/template/log.html").text();
 const logGroup = await Bun.file("./frontend/template/log-group.html").text();
 const removeBtn = await Bun.file("./frontend/template/removebtn.html").text();
 let changelog = await Bun.file("./frontend/template/changelogs.html").text();

 const featuresLabel = config.featuresLabel || "Features";
 const deprecationsLabel = config.deprecationsLabel || "Deprecated";
 const fixesLabel = config.fixesLabel || "Fixes";
 const metaTags = config.metaTags || "";
 const maxEntries = config.maxEntries ? parseInt(config.maxEntries) : 10;
 const versioning = config.versioning;

 let useVersioning = false;
 if (versioning) useVersioning = versioning === "true" || versioning === "on";

 changelog = changelog
  .replaceAll("[META]", metaTags)
  .replaceAll("[PAGETITLE]", config.pageTitle || "Changelogs")
  .replaceAll("[PAGESUBTITLE]", config.pageSubtitle ? parseMd(config.pageSubtitle) : "");

 if (useVersioning) {
  const logsByVersion = logs.reduce((acc, log) => {
   if (!log.version) return acc;
   if (!acc[log.version]) acc[log.version] = [];
   acc[log.version].push(log);
   return acc;
  }, {} as { [key: string]: ChangeLogAttributes[] });

  const versions = (await getVersions())
   .filter((version) => {
    if (!logsByVersion[version.id]) return false;
    if (isLoggedIn && !version.released) {
     // minimun date possible
     version.released = new Date(0);
    }
    return version.released !== null;
   })
   .sort((a, b) => (a.id > b.id ? -1 : 1))
   .splice(0, maxEntries);

  versions.forEach(({ id, released }) => {
   let group = logGroup
    .replace("[VERSION]", released.getTime() === 0 ? `${id} (Unreleased)` : id)
    .replace("[DATE]", formatInTimeZone(released, "UTC", "dd/MM/yyyy"));

   let hasFeatures = false;
   let hasDeprecations = false;
   let hasFixes = false;

   logsByVersion[id].forEach(({ type, message, id }) => {
    const nLog = log
     .replaceAll("[MESSAGE]", `◦ ${parseMd(message)}`)
     .replaceAll("[REMOVEBUTTON]", isLoggedIn ? removeBtn : "")
     .replaceAll("[LOGID]", id.toString());

    switch (type) {
     case "feature":
      hasFeatures = true;
      group = group.replace("[FEATURELOGS]", `${nLog}[FEATURELOGS]`);
      break;
     case "deprecated":
      hasDeprecations = true;
      group = group.replace("[DEPRECATEDLOGS]", `${nLog}[DEPRECATEDLOGS]`);
      break;
     case "fix":
      hasFixes = true;
      group = group.replace("[FIXLOGS]", `${nLog}[FIXLOGS]`);
      break;
    }
   });

   if (hasFeatures) group = group.replace("[NEWFEATURES]", featuresLabel);
   else group = group.replace("[NEWFEATURES]", "");

   if (hasDeprecations) group = group.replace("[DEPRECATED]", deprecationsLabel);
   else group = group.replace("[DEPRECATED]", "");

   if (hasFixes) group = group.replace("[FIXES]", fixesLabel);
   else group = group.replace("[FIXES]", "");

   group = group
    .replace("[FEATURELOGS]", "")
    .replace("[DEPRECATEDLOGS]", "")
    .replace("[FIXLOGS]", "");

   changelog = changelog.replace("[LOGS]", `${group}[LOGS]`);
  });
 } else {
  const logsByDate = logs.reduce((acc, log) => {
   const iso = new Date(log.date).toISOString().split("T")[0] + "T00:00:00.000Z"; // removes any timezone

   if (!acc[iso]) acc[iso] = [];
   acc[iso].push(log);
   return acc;
  }, {} as { [key: string]: ChangeLogAttributes[] });

  const dates = Object.keys(logsByDate)
   .sort((a, b) => (a > b ? -1 : 1))
   .splice(0, maxEntries);

  console.log(`💩 ~ file: changelogs.ts:182 ~ app.get ~ dates:`, dates);

  dates.forEach((date) => {
   let group = logGroup
    .replace("[VERSION]", formatInTimeZone(new Date(date), "UTC", "dd/MM/yyyy"))
    .replace("[DATE]", "");

   let hasFeatures = false;
   let hasDeprecations = false;
   let hasFixes = false;

   logsByDate[date].forEach(({ type, message, id }) => {
    const nLog = log
     .replaceAll("[MESSAGE]", `◦ ${parseMd(message)}`)
     .replaceAll("[REMOVEBUTTON]", isLoggedIn ? removeBtn : "")
     .replaceAll("[LOGID]", id.toString());

    switch (type) {
     case "feature":
      hasFeatures = true;
      group = group.replace("[FEATURELOGS]", `${nLog}[FEATURELOGS]`);
      break;
     case "deprecated":
      hasDeprecations = true;
      group = group.replace("[DEPRECATEDLOGS]", `${nLog}[DEPRECATEDLOGS]`);
      break;
     case "fix":
      hasFixes = true;
      group = group.replace("[FIXLOGS]", `${nLog}[FIXLOGS]`);
      break;
    }
   });

   if (hasFeatures) group = group.replace("[NEWFEATURES]", featuresLabel);
   else group = group.replace("[NEWFEATURES]", "");

   if (hasDeprecations) group = group.replace("[DEPRECATED]", deprecationsLabel);
   else group = group.replace("[DEPRECATED]", "");

   if (hasFixes) group = group.replace("[FIXES]", fixesLabel);
   else group = group.replace("[FIXES]", "");

   group = group
    .replace("[FEATURELOGS]", "")
    .replace("[DEPRECATEDLOGS]", "")
    .replace("[FIXLOGS]", "");

   changelog = changelog.replace("[LOGS]", `${group}[LOGS]`);
  });
 }

 changelog = changelog.replace("[LOGS]", "");

 return res.status(200).setHeader("content-type", "text/html").send(changelog);
});

app.delete("/changelog", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const id = parseInt(getQuery(req.url).id);
 if (!id) return res.status(400).send("missing_id");

 const logVersion = await deleteChangeLog(id);
 if (logVersion)
  if (await isVersionEmpty(logVersion)) {
   console.log("DELETANDO VERSÃO");
   await deleteVersion(logVersion);
  }

 res.status(200).send("success");
});

app.post("/changelog", async (req, res) => {
 if (!(await validateSecret(getQuery(req.url).secret)))
  return res.status(401).send("invalid_secret");

 const formData = await req.formData();

 const body: { [key: string]: string } = {};
 formData.forEach((value, key) => {
  if (typeof value !== "string") return;
  body[key] = value as string;
 });

 const { type, message, date } = body;
 if (!type) return res.status(400).send("missing_type");
 if (!message) return res.status(400).send("missing_message");

 const version = body.version;

 if (version) {
  const versionExists = await getVersion(version);
  if (!versionExists)
   await addVersion({ id: version } as Partial<VersionAttributes> as VersionAttributes);
 }

 const changeLog = {
  type,
  message,
  date: date ? new Date(date) : new Date(),
  version,
 } as Partial<ChangeLogAttributes>;

 await addChangeLog(changeLog as ChangeLogAttributes);

 res.status(201).send("success");
});

app.post("/changelog/hook", async (req, res) => {
 const secret = await Bun.file("./secret.txt").text();
 const configuration = await getConfiguration();

 const branches = configuration.branches;

 let platform = "";
 if (req.headers.get("x-hub-signature-256")) platform = "github";
 else if (req.headers.get("x-gitlab-token")) platform = "gitlab";
 else return res.status(400).send("invalid_platform");

 const body: {
  branch: string;
  commits: { message: string }[];
 } = {
  branch: "",
  commits: [],
 };

 // validade secret and parse body based on platform
 if (platform === "github") {
  let gitSecret = req.headers.get("x-hub-signature-256");
  if (!gitSecret) return res.status(401).send("missing_secret");

  gitSecret = gitSecret.replace("sha256=", "");
  const textBody = await req.text();
  const hash = createHmac("sha256", secret).update(textBody).digest("hex");
  if (hash !== gitSecret) return res.status(401).send("invalid_secret");

  const parsed = JSON.parse(textBody);
  body.branch = parsed.ref.split("/").pop();
  body.commits = parsed.commits.map((commit: { message: string }) => {
   return { message: commit.message };
  });
 } else {
  let gitSecret = req.headers.get("x-gitlab-token");
  if (gitSecret !== secret) return res.status(401).send("invalid_secret");
  const parsed = await req.json();
  body.branch = parsed.ref.split("/").pop();
  body.commits = parsed.commits.map((commit: { message: string }) => {
   return { message: commit.message };
  });
 }

 // valida se a branch do push é uma das branchs permitidas
 if (branches && branches.length > 0) {
  const options = branches.split(",");
  const pushedBranch = body.branch;

  const valid = options.some((option) => {
   // regex to match branch name
   const regex = new RegExp(option);
   if (regex.test(pushedBranch)) return true;
   return false;
  });

  if (!valid) return res.status(200).send("incorrect_branch");
 }

 const changelogMessage: string[] = [];

 /*
      
    MESSAGE EXAMPLE

    [changelog|1.0.0|release]
    [feature] Lorem ipsum dolor sit amet
    [fix] Lorem ipsum dolor sit amet
    [deprecation] Lorem ipsum dolor sit amet
    [end]

*/

 body.commits.forEach((commit: { message: string }) => {
  const message = commit.message;
  if (!message.includes("[changelog")) return;
  const parsedMessage = message.split("[changelog")[1].trim();
  if (parsedMessage) changelogMessage.push(parsedMessage);
 });

 if (!changelogMessage.length) return res.status(200).send("no_changelog_message");

 for (let j = 0; j < changelogMessage.length; j++) {
  try {
   const index = changelogMessage[j].indexOf("]") + 1; // find the first occurrence of ']'

   const firstMessage = changelogMessage[j].substring(0, index - 1); // get the text before "]" Example: |1.0.0|release
   const secondMessage = changelogMessage[j].substring(index); // get the rest of the text

   const [_, version, release] = firstMessage.split("|");

   const isVersioned = !!version;

   const modifications = secondMessage.split("[end]")[0].split("[");

   const logs = modifications.map((mod) => {
    mod = mod.trim();
    if (!mod) return null;
    const [type, message] = mod.split("]");
    if (!typeMapper[type]) return null;
    return { type: typeMapper[type], message: message.trim() };
   });

   const date = new Date(); // data teste

   if (isVersioned && configuration.versioning === "on") {
    const versionExists = await getVersion(version);
    if (!versionExists)
     await addVersion({ id: version } as Partial<VersionAttributes> as VersionAttributes);
   }

   for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (!log) continue;

    if (!log.type || !log.message) continue;

    const changeLog = {
     type: log.type,
     message: log.message,
     date,
     version: isVersioned && configuration.versioning === "on" ? version : null,
    } as Partial<ChangeLogAttributes>;

    // we only add the log if a exact match doesn't exist
    if (!(await commitIdentifierExists(changeLog.message as string, changeLog.type as string))) {
     await addChangeLog(changeLog as ChangeLogAttributes);
     await addCommitIdentifier(changeLog.message as string, changeLog.type as string);
    }
   }

   if (!!release) await releaseVersion(version);
  } catch (e) {
   console.error(e);
  }
 }

 res.status(200).send("success");
});
