import z from "zod";
import {
  createGroupChatArgumentSchema,
  createOneToOneChatArgumentSchema,
  sendMessageInChatArgumentSchema,
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
  lastMessageAt: Date;
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

    me: async (
      parent: unknown,
      args: {},
      context: IContext,
      info: unknown
    ): Promise<IUserTypeDef> => {
      // retreive the user
      const foundUser: IUser | null = await UserModel.findById(context.userId);

      if (!foundUser) {
        throw new GraphQLError("Something went wrong.");
      }

      return {
        id: foundUser._id.toString(),
        name: foundUser.name,
        username: foundUser.username,
        email: foundUser.email,
        profilePicture: foundUser.profilePicture,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt,
      };
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

    createOneToOneChat: async (
      parent: unknown,
      args: z.infer<typeof createOneToOneChatArgumentSchema>,
      context: IContext,
      info: unknown
    ): Promise<IChatTypeDef> => {
      // validate the arguments
      const validatedArguments =
        createOneToOneChatArgumentSchema.safeParse(args);

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

      try {
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

        // fetch the populated options chat
        const populatedChat = await ChatModel.findById(checkChatExists._id)
          .populate("participants")
          .populate("groupAdmin");

        if (!populatedChat) {
          throw new GraphQLError("Failed to load chat.");
        }

        // return the data
        return {
          id: populatedChat._id.toString(),
          isGroupChat: populatedChat.isGroupChat,
          participants: populatedChat.participants.map((participant) => {
            return mapUser(participant as any);
          }),
          lastMessageAt: populatedChat.lastMessageAt,
          createdAt: populatedChat.createdAt,
          updatedAt: populatedChat.updatedAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError("Something went wrong.");
      }
    },

    createGroupChat: async (
      parent: unknown,
      args: z.infer<typeof createGroupChatArgumentSchema>,
      context: IContext,
      info: unknown
    ): Promise<IChatTypeDef> => {
      // validate the arguments
      const validatedArguments = createGroupChatArgumentSchema.safeParse(args);

      if (!validatedArguments.success) {
        throw new GraphQLError(validatedArguments.error.issues[0].message);
      }

      try {
        // validate and check if all the users are valid
        const users = await Promise.all(
          validatedArguments.data.participants.map(async (userId) => {
            const user = await UserModel.findById(userId);

            if (!user) {
              throw new GraphQLError("Invalid request.");
            }

            return user;
          })
        );

        const participantsIds = users.map((user) => user._id);

        // add the user itself in the gc
        participantsIds.push(new Types.ObjectId(context.userId));

        // create the chat
        const createdChat: IChat = await ChatModel.create({
          chatName: validatedArguments.data.chatName,
          isGroupChat: true,
          participants: participantsIds,
          groupAdmin: context.userId,
        });

        const populatedChat = await ChatModel.findById(createdChat._id)
          .populate("participants")
          .populate("groupAdmin");

        if (!populatedChat) {
          throw new GraphQLError("Failed to load chat.");
        }

        return {
          id: populatedChat._id.toString(),
          chatName: populatedChat.chatName,
          isGroupChat: populatedChat.isGroupChat,
          participants: populatedChat.participants.map((participant) => {
            return mapUser(participant as any);
          }),
          groupAdmin: mapUser(populatedChat?.groupAdmin as any),
          lastMessageAt: populatedChat.lastMessageAt,
          createdAt: populatedChat.createdAt,
          updatedAt: populatedChat.updatedAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError("Something went wrong.");
      }
    },

    sendMessageInChat: async (
      parent: unknown,
      args: z.infer<typeof sendMessageInChatArgumentSchema>,
      context: IContext,
      info: unknown
    ): Promise<IMessageTypeDef> => {
      // validate the argument
      const validatedArguments =
        sendMessageInChatArgumentSchema.safeParse(args);

      if (!validatedArguments.success) {
        throw new GraphQLError(validatedArguments.error.issues[0].message);
      }

      // check if the chat document exists
      const checkChatExists: IChat | null = await ChatModel.findById(
        validatedArguments.data.chatId
      );

      if (!checkChatExists) {
        throw new GraphQLError("No chat found with provided chat id.");
      }

      // check if file is uploaded instead
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

      // update the last message field
      await ChatModel.findByIdAndUpdate(checkChatExists._id, {
        lastMessageAt: Date.now(),
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
