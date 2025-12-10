import { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";

const safeRoutes: string[] = ["/auth/register", "/auth/login"];

const JWTSecretKey = Bun.env.JWT_SECRET_KEY;

if (!JWTSecretKey) {
  throw new Error("JWT Secret Key not defined in .env file.");
}

const verifyUserMiddleware = async (c: Context, next: Next) => {
  // if the routes are registration and login allow the request
  if (safeRoutes.includes(c.req.url)) {
    await next();
  }

  // access the cookie from the request
  const accessCookie = c.req.header("cookie")?.split("=")[1];

  // if no cookie found return unauthorized
  if (!accessCookie) {
    return c.json({ success: false, message: "Unauthorized." }, 401);
  }

  try {
    //   decode the cookie value using jsonwebtokens
    const decoded = jwt.verify(accessCookie, JWTSecretKey);

    c.set("userId", decoded);

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Something went wrong.",
      },
      500
    );
  }
};

export default verifyUserMiddleware;
