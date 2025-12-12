import { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie";

const safeRoutes: string[] = ["/auth/register", "/auth/login"];

const JWTSecretKey = Bun.env.JWT_SECRET_KEY;

if (!JWTSecretKey) {
  throw new Error("JWT Secret Key not defined in .env file.");
}

interface JWTPayload extends jwt.JwtPayload {
  id: string;
}

const verifyUserMiddleware = async (c: Context, next: Next) => {
  // if the routes are registration and login allow the request
  if (safeRoutes.includes(c.req.path)) {
    await next();
  }

  // access the cookie from the request
  const accessCookie = getCookie(c, "auth_token");

  // if no cookie found return unauthorized
  if (!accessCookie) {
    return c.json({ success: false, message: "Unauthorized." }, 401);
  }

  try {
    //   decode the cookie value using jsonwebtokens
    const decoded = jwt.verify(accessCookie, JWTSecretKey);

    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      c.set("userId", (decoded as JWTPayload).id);

      await next();
    } else {
      return c.json({ success: false, message: "Unauthorized." }, 401);
    }
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
