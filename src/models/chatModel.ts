import { Types } from "mongoose";
import { Schema, Document, model } from "mongoose";

interface IChat extends Document {
  chatName?: string;
  isGroupChat: boolean;
  participants: Types.ObjectId[];
  groupAdmin?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    chatName: {
      type: String,
      trim: true,
      maxlength: 50,
      required: false,
    },

    isGroupChat: {
      type: Boolean,
      required: true,
      default: false,
    },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    groupAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const ChatModel = model<IChat>("Chat", chatSchema);

export { IChat, ChatModel };
