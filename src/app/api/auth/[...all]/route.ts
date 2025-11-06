import { auth } from "@/lib/auth";

const handler = auth.handler;

export const { POST, GET } = {
  POST: handler,
  GET: handler,
};
