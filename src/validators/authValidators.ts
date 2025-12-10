import z from "zod";

// create user validation schema
const registerUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),

  username: z.string().min(3, "Username must be at least 3 characters long"),

  profilePicture: z
    .custom<File>((val) => val instanceof File, {
      message: "Expected a File object",
    })
    .optional()
    .refine(
      (file) =>
        file === undefined ||
        ["image/png", "image/jpeg", "image/webp"].includes(file.type),
      {
        message: "Invalid file type",
      }
    )
    .refine((file) => file === undefined || file.size <= 5 * 1024 * 1024, {
      message: "File must be under 5 MB",
    }),

  email: z.email(),

  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// login user validation schema
const loginUserSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .optional(),

    email: z.email().optional(),

    password: z.string().min(6, "Password must be at least 6 characters long"),
  })
  .refine((data) => data.username || data.email, {
    message: "Either username or email must be provided",
  });

export { registerUserSchema, loginUserSchema };
