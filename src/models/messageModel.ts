import { Types } from "mongoose";
import { Schema, model, Document } from "mongoose";

interface IMessage extends Document {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

const MessageModel = model<IMessage>("Message", messageSchema);

export { IMessage, MessageModel };
