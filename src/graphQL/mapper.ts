import { IChat } from "../models/chatModel";
import { IUser } from "../models/userModel";
import { IChatTypeDef, IUserTypeDef } from "./resolvers";

// helper functions for mapping graphql return types

const mapUser = (user: IUser): IUserTypeDef => ({
  id: user._id.toString(),
  name: user.name,
  username: user.username,
  email: user.email,
  profilePicture: user.profilePicture,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const mapChat = (chat: IChat & { participants: IUser[] }): IChatTypeDef => ({
  id: chat._id.toString(),
  chatName: chat.chatName,
  isGroupChat: chat.isGroupChat,
  participants: chat.participants.map(mapUser),
  groupAdmin: chat.groupAdmin ? mapUser(chat.groupAdmin as any) : undefined,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

export { mapUser, mapChat };
