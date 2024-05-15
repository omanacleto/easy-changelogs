import { DataTypes, Sequelize } from "sequelize";

export const sequelize = new Sequelize({
 dialect: "sqlite",
 storage: "./db.sqlite",
});

export type ConfigurationAttributes = {
 id: string;
 value: string;
};

const Configuration = sequelize.define("Configuration", {
 id: { type: DataTypes.STRING, primaryKey: true },
 value: { type: DataTypes.STRING },
});

export type ChangeLogAttributes = {
 id: number;
 date: Date;
 type: string;
 message: string;
 version: string;
};

export type VersionAttributes = {
 id: string;
 released: Date;
};

const Version = sequelize.define("Version", {
 id: { type: DataTypes.STRING, primaryKey: true },
 released: { type: DataTypes.DATE },
});

const ChangeLog = sequelize.define("ChangeLog", {
 id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
 type: { type: DataTypes.STRING },
 message: { type: DataTypes.STRING },
 date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
 version: { type: DataTypes.STRING },
});

export async function getConfiguration(): Promise<{
 [key: string]: string;
}> {
 const obj: {
  [key: string]: string;
 } = {};

 const config = await Configuration.findAll();
 for (const item of config) {
  obj[item.dataValues.id] = item.dataValues.value;
 }

 return obj;
}

export async function setConfiguration(id: string, value: string) {
 await Configuration.upsert({ id, value });
}

export async function getChangeLog(): Promise<ChangeLogAttributes[]> {
 return (await ChangeLog.findAll()) as unknown as ChangeLogAttributes[];
}

export async function addChangeLog(attributes: ChangeLogAttributes) {
 await ChangeLog.create(attributes);
}

export async function logExists(message: string, type: string): Promise<boolean> {
 const log = await ChangeLog.findOne({ where: { message, type } });
 return !!log;
}

export async function updateChangeLog(id: number, attributes: Partial<ChangeLogAttributes>) {
 const log = await ChangeLog.update(attributes, { where: { id } });
}

export async function deleteChangeLog(id: number): Promise<string | undefined> {
 const data = await ChangeLog.findOne({ where: { id } });
 if (!data) return;
 await ChangeLog.destroy({ where: { id } });
 return data.dataValues.version;
}

export async function isVersionEmpty(id: string): Promise<boolean> {
 return (await ChangeLog.findOne({ where: { version: id } })) === null;
}

export async function getVersions(): Promise<VersionAttributes[]> {
 return (await Version.findAll()) as unknown as VersionAttributes[];
}

export async function getVersion(id: string): Promise<VersionAttributes | null> {
 return (await Version.findOne({ where: { id } })) as unknown as VersionAttributes;
}

export async function getUnreleasedVersions(): Promise<VersionAttributes[]> {
 return (await Version.findAll({ where: { released: null } })) as unknown as VersionAttributes[];
}

export async function addVersion(attributes: VersionAttributes) {
 await Version.create(attributes);
}

export async function releaseVersion(id: string) {
 await Version.update({ released: new Date() }, { where: { id } });
}

export async function deleteVersion(id: string) {
 await Version.destroy({ where: { id } });
 await ChangeLog.destroy({ where: { version: id } });
}

export async function initializeDatabase() {
 console.log("Initializing Database");
 await Configuration.sync();
 await ChangeLog.sync();
 await Version.sync();

 /*
    If there is no configuration, populate with defaults
    {
        "pageTitle": "Changelog",
        "pageSubtitle": "Find all the new features, fixes and deprecations here",
        "featuresLabel": "Features",
        "fixesLabel": "Fixes",
        "deprecationsLabel": "Deprecations",
        "dateFormat": "dd/MM/yyyy",
        "maxEntries": "31",
        "metaTags": "",
        "versioning": "on",
        "branches": "",
        "secret": "secret"
    }
 */
 if ((await Configuration.findAll()).length === 0) {
  console.log("Populating Default Configuration");
  await Configuration.bulkCreate([
   { id: "pageTitle", value: "Changelog" },
   { id: "pageSubtitle", value: "Find all the new features, fixes and deprecations here" },
   { id: "featuresLabel", value: "Features" },
   { id: "fixesLabel", value: "Fixes" },
   { id: "deprecationsLabel", value: "Deprecations" },
   { id: "dateFormat", value: "dd/MM/yyyy" },
   { id: "maxEntries", value: "31" },
   { id: "metaTags", value: "" },
   { id: "versioning", value: "on" },
   { id: "branches", value: "" },
   { id: "secret", value: "secret" },
  ]);
 }
}
