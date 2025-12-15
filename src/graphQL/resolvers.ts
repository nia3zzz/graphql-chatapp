import z from "zod";
import {
  sendMessageOneToOneArgumentSchema,
  updateUserArgumentSchema,
} from "../validators/resolverValidators";
import { GraphQLError } from "graphql";
import { cloudinary, UploadApiResponse } from "../cloudinary";
import { IUser, UserModel } from "../models/userModel";
import { ChatModel, IChat } from "../models/chatModel";
import { IMessage, MessageModel } from "../models/messageModel";
import { Types } from "mongoose";
import { mapChat, mapUser } from "./mapper";

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

interface IChatTypeDef {
  id: string;
  chatName?: string;
  isGroupChat: boolean;
  participants: IUserTypeDef[];
  groupAdmin?: IUserTypeDef;
  createdAt: Date;
  updatedAt: Date;
}

interface IMessageTypeDef {
  id: string;
  chat: IChatTypeDef;
  sender: IUserTypeDef;
  content: string;
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
          id: updatedUser._id.toString(),
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

    sendMessageOneToOne: async (
      parent: unknown,
      args: z.infer<typeof sendMessageOneToOneArgumentSchema>,
      context: IContext,
      info: unknown
    ): Promise<IMessageTypeDef> => {
      // validate the arguments
      const validatedArguments =
        sendMessageOneToOneArgumentSchema.safeParse(args);

      if (!validatedArguments.success) {
        throw new GraphQLError(validatedArguments.error.issues[0].message);
      }

      // check if a reciepeint user exists with the provided user id
      const checkReciepeintUserExists: IUser | null = await UserModel.findById(
        validatedArguments.data.userId
      );

      if (!checkReciepeintUserExists) {
        throw new GraphQLError("No user found with provided user id.");
      }

      // check if a chat model exists between the users
      let checkChatExists: IChat | null = null;
      checkChatExists = await ChatModel.findOne({
        isGroupChat: false,
        participants: {
          $all: [context.userId, checkReciepeintUserExists._id],
          $size: 2,
        },
      });

      if (!checkChatExists) {
        // create the chat model
        checkChatExists = await ChatModel.create({
          isGroupChat: false,
          participants: [
            new Types.ObjectId(context.userId),
            checkReciepeintUserExists._id,
          ],
        });
      }

      // if user uploaded a file
      let contentValue: string | null = null;

      contentValue = validatedArguments.data.message ?? "";

      if (validatedArguments.data.file) {
        // convert to buffer
        const file = validatedArguments.data.file as File;
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

        contentValue = uploadResult.secure_url;
      }

      // create the message mutation
      const createMessage: IMessage = await MessageModel.create({
        chat: checkChatExists._id,
        sender: new Types.ObjectId(context.userId),
        content: contentValue,
      });

      // query the message with populated values
      const populatedMessage = await MessageModel.findById(createMessage._id)
        .populate("sender")
        .populate({
          path: "chat",
          populate: {
            path: "participants groupAdmin",
          },
        });

      if (!populatedMessage) {
        throw new GraphQLError("Failed to load message.");
      }

      return {
        id: populatedMessage._id.toString(),
        chat: mapChat(populatedMessage.chat as any),
        sender: mapUser(populatedMessage.sender as any),
        content: populatedMessage.content,
        createdAt: populatedMessage.createdAt,
        updatedAt: populatedMessage.updatedAt,
      };
    },
  },
};

export { IUserTypeDef, IChatTypeDef, IMessageTypeDef, resolvers };
