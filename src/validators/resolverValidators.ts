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

// send message schema
const createOneToOneChatArgumentSchema = z.object({
  userId: z.string().length(24, "Invalid user id, must be 24 characters long."),
});

// create group chat
const createGroupChatArgumentSchema = z.object({
  chatName: z
    .string()
    .min(2, "Chat name is too short.")
    .max(15, "Chat name is too long."),

  participants: z
    .array(
      z.string().length(24, "Invalid user id, must be 24 characters long.")
    )
    .min(3, "At least 3 participants are required."),
});

export {
  updateUserArgumentSchema,
  createOneToOneChatArgumentSchema,
  createGroupChatArgumentSchema,
};
