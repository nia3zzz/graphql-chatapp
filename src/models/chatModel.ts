import { Schema, Document, model } from "mongoose";

interface IChat extends Document {
  id: Schema.Types.ObjectId;
  chatName?: string;
  isGroupChat: boolean;
  participants: Schema.Types.ObjectId[];
  groupAdmin?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    chatName: {
      type: String,
      trim: true,
      maxlength: 50,
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
    },
  },
  {
    timestamps: true,
  }
);

const chatModel = model<IChat>("Chat", chatSchema);

export { IChat, chatModel };
