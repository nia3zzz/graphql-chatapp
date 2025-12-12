import z from "zod";
import { updateUserArgumentSchema } from "../validators/resolverValidators";
import { GraphQLError } from "graphql";
import { cloudinary, UploadApiResponse } from "../cloudinary";
import { IUser, UserModel } from "../models/userModel";

// manual coding the type defs once again
interface IUserTypeDef {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePicture: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IContext {
  userId: string;
}

const resolvers = {
  Query: {
    hello: (): string => {
      return "Hello world!";
    },
  },

  Mutation: {
    updateUser: async (
      parent: unknown,
      args: z.infer<typeof updateUserArgumentSchema>,
      context: IContext,
      info: unknown
    ): Promise<IUserTypeDef> => {
      //validate the data using zod schema
      const validatedArguments = updateUserArgumentSchema.safeParse(args);

      if (!validatedArguments.success) {
        throw new GraphQLError(validatedArguments.error.issues[0].message);
      }

      // if a user exists with email or username exists
      if (
        await UserModel.findOne({
          $or: [
            { email: validatedArguments.data.email },
            { username: validatedArguments.data.username },
          ],
        })
      ) {
        throw new GraphQLError(
          "User with this email or username already exists."
        );
      }

      let profilePictureUrl: string | undefined = undefined;

      try {
        // if new profile picture is provided
        if (validatedArguments.data?.profilePicture) {
          // convert to buffer
          const file = validatedArguments.data.profilePicture as File;
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

        // build a dynamic object
        let updateUserData: { [key: string]: any } = {};
        if (validatedArguments.data?.name)
          updateUserData.name = validatedArguments.data.name;
        if (validatedArguments.data?.username)
          updateUserData.username = validatedArguments.data.username;
        if (profilePictureUrl)
          updateUserData.profilePicture = profilePictureUrl;
        if (validatedArguments.data?.email)
          updateUserData.email = validatedArguments.data.email;

        // check if a false update
        const foundUser: IUser | null = await UserModel.findById(
          context.userId
        );

        if (!foundUser) {
          throw new GraphQLError("Something went wrong.");
        }

        const hasAnyChange = Object.entries(updateUserData).some(
          ([key, value]) => {
            return foundUser[key as keyof IUser] !== value;
          }
        );

        if (!hasAnyChange) {
          throw new GraphQLError("No changes found.");
        }

        // update the user
        const updatedUser: IUser | null = await UserModel.findByIdAndUpdate(
          context.userId,
          updateUserData,
          {
            new: true,
          }
        );

        if (!updatedUser) {
          throw new GraphQLError("Something went wrong.");
        }

        return {
          id: updatedUser.id.toString(),
          name: updatedUser.name,
          username: updatedUser.username,
          profilePicture: updatedUser.profilePicture,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError("Something went wrong.");
      }
    },
  },
};

export default resolvers;
