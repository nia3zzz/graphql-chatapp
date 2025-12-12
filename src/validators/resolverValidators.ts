import z from "zod";

// update user schema
const updateUserArgumentSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters long")
      .optional(),

    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .optional(),

    profilePicture: z
      .custom<File>((val) => val instanceof File, {
        message: "Expected a File object",
      })
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
      })
      .optional(),

    email: z.email().optional(),
  })
  .refine(
    (data) => data.name || data.username || data.profilePicture || data.email,
    {
      message: "At least one field must be provided.",
    }
  );

export { updateUserArgumentSchema };
