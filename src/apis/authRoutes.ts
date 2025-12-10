// auth routes
import { Hono } from "hono";
import {
  loginUserSchema,
  registerUserSchema,
} from "../validators/authValidators";
import z from "zod";
import { IUser, UserModel } from "../models/userModel";
import { UploadApiResponse, cloudinary } from "../cloudinary";
import * as jwt from "jsonwebtoken";
import { setCookie, deleteCookie } from "hono/cookie";

// start up new instance of hono
const authRoutes = new Hono();

// create user route
authRoutes.post("/register", async (c) => {
  // parse the request body
  const body = await c.req.parseBody();

  // validate using zod schema
  const validatedData = registerUserSchema.safeParse(body);

  if (!validatedData.success) {
    return c.json(
      {
        success: false,
        message: "Failed in type validation.",
        errors: z.flattenError(validatedData.error),
      },
      400
    );
  }

  // if a user exists with email or username exists
  if (
    await UserModel.findOne({
      $or: [
        { email: validatedData.data.email },
        { username: validatedData.data.username },
      ],
    })
  ) {
    return c.json(
      {
        success: false,
        message: "User with this email or username already exists.",
      },
      409
    );
  }

  try {
    // hash the password using bun's native api
    const hashedPassword: string = await Bun.password.hash(
      validatedData.data.password
    );

    let profilePictureUrl: string | undefined = undefined;

    // upload the image to cloudinary
    if (validatedData.data.profilePicture) {
      // convert to buffer
      const file = validatedData.data.profilePicture as File;
      const buffer = Buffer.from(await file.arrayBuffer());

      // upload in stream
      const uploadResult: UploadApiResponse = await new Promise(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "graphql-chatapp",
            },
            (err, result) => {
              if (result) resolve(result);
              else reject(err);
            }
          );

          uploadStream.end(buffer);
        }
      );

      profilePictureUrl = uploadResult.secure_url;
    }

    // create the user
    const createUser: IUser = await UserModel.create({
      name: validatedData.data.name,
      email: validatedData.data.email,
      profilePicture: profilePictureUrl,
      username: validatedData.data.username,
      password: hashedPassword,
    });

    return c.json(
      {
        success: true,
        message: "User registered successfully.",
        data: { id: createUser.id },
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Internal server error.",
      },
      500
    );
  }
});

// login user route
authRoutes.post("/login", async (c) => {
  // parse the request body
  const body = await c.req.json();

  // validate body using zod schema
  const validatedData = loginUserSchema.safeParse(body);

  if (!validatedData.success) {
    return c.json(
      {
        success: false,
        message: "Failed in type validation.",
        errors: z.flattenError(validatedData.error),
      },
      400
    );
  }

  // check if user exists with username or email
  const foundUser: IUser | null = await UserModel.findOne(
    validatedData.data.username
      ? { username: validatedData.data.username }
      : { email: validatedData.data.email }
  );

  if (!foundUser) {
    return c.json(
      {
        success: false,
        message: "Invalid credentials.",
      },
      401
    );
  }

  // verify password
  const isPasswordValid: boolean = await Bun.password.verify(
    validatedData.data.password,
    foundUser.password
  );

  if (!isPasswordValid) {
    return c.json(
      {
        success: false,
        message: "Invalid credentials.",
      },
      401
    );
  }
  try {
    // generate a token
    const token = jwt.sign(
      {
        id: foundUser.id,
      },
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: "30d" }
    );

    setCookie(c, "auth_token", token);

    return c.json(
      {
        status: true,
        message: "Login successful.",
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        status: false,
        message: "Internal server error.",
      },
      500
    );
  }
});

// logout user route
authRoutes.post("/logout", async (c) => {
  try {
    // delete the cookie from the user
    deleteCookie(c, "auth_token");

    return c.json(
      {
        status: true,
        messge: "User logged-out",
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        status: false,
        message: "Something went wrong.",
      },
      500
    );
  }
});

export default authRoutes;
