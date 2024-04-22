import { Sequelize } from "sequelize";
import { setupRoutes } from "./routes/setupRoutes";

export const sequelize = new Sequelize({
 dialect: "sqlite",
 storage: "./db.sqlite",
});

type Resp = {
 setHeader: (key: string, value: string) => Resp;
 status: (code: number) => Resp;
 send: (data: any) => Resp;
};

type CustomRequest = Request & {
 // key value object
 query: {
  [key: string]: string;
 };
 jsonBody: any;
};

type ServerRequest = (req: Request, res: Resp, next: () => void) => Promise<Resp | void>;

const routes: {
 get: { path: string; handler: ServerRequest }[];
 post: { path: string; handler: ServerRequest }[];
 put: { path: string; handler: ServerRequest }[];
 delete: { path: string; handler: ServerRequest }[];
} = { get: [], post: [], put: [], delete: [] };

export const app = {
 get: (path: string, handler: ServerRequest) => {
  routes.get.push({ path, handler });
 },
 post: (path: string, handler: ServerRequest) => {
  routes.post.push({ path, handler });
 },
 put: (path: string, handler: ServerRequest) => {
  routes.put.push({ path, handler });
 },
 delete: (path: string, handler: ServerRequest) => {
  routes.delete.push({ path, handler });
 },
};

const server = Bun.serve({
 port: process.env.PORT || 3000,
 async fetch(req) {
  const url = new URL(req.url);

  const availableRoutes = routes[
   req.method.toLowerCase() as "get" | "post" | "put" | "delete"
  ].filter((route) => {
   route.path = route.path.replace(/:\w+/g, "[^/]+");
   return new RegExp(`^${route.path}$`).test(url.pathname);
  });

  if (availableRoutes.length === 0) return new Response("Not Found", { status: 404 });

  //   // insere parametros de query
  //   (req as CustomRequest).query = {};
  //   url.searchParams.forEach((value, key) => {
  //    (req as CustomRequest).query[key] = value;
  //   });

  let status: number = 200;
  let responseHeaders: {
   [key: string]: string;
  } = { "content-type": "application/json" };
  let responseBody: any = {};

  let goToNext = false;
  for (let i = 0; i < availableRoutes.length; i++) {
   const route = availableRoutes[i];

   const resp: Resp = {
    status: (code: number) => {
     status = code;
     return resp;
    },
    setHeader: (key: string, value: string) => {
     responseHeaders[key] = value;
     return resp;
    },
    send: (data: any) => {
     responseBody = data;
     return resp;
    },
   };

   try {
    await route.handler(req, resp, () => {
     goToNext = true;
    });
   } catch (e: any) {
    console.error(e);
    return new Response(`Internal Server Error - ${e.message}`, { status: 500 });
   }

   if (!goToNext) break;
  }

  // tratamento para objetos JSON
  if (responseHeaders["content-type"] === "application/json" && typeof responseBody === "object")
   responseBody = JSON.stringify(responseBody);

  return new Response(responseBody, {
   headers: responseHeaders,
   status,
  });
 },
});

console.log(`Listening on http://localhost:${server.port} ...`);

setupRoutes();
