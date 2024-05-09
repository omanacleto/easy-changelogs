import { app } from "..";

app.get("/jquery.js", async (req, res) => {
 const src = await Bun.file("./frontend/libs/jquery.min.js").text();
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});

app.get("/tailwind.js", async (req, res) => {
 const src = await Bun.file("./frontend/libs/tailwind.min.js").text();
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});

app.get("/nanoid", async (req, res) => {
 const src = await Bun.file("./frontend/libs/nanoid.min.js").text();
 res.setHeader("content-type", "application/javascript").status(200).send(src);
});
