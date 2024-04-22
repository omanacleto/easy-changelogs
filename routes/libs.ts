import { app } from "..";

app.get("/jquery", async (req, res) => {
 const src = await Bun.file("./frontend/libs/jquery.min.js");
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});

app.get("/tailwind", async (req, res) => {
 const src = await Bun.file("./frontend/libs/tailwind.min.js");
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});

app.get("/nanoid", async (req, res) => {
 const src = await Bun.file("./frontend/libs/nanoid.min.js");
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});
