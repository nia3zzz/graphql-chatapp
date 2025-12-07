import { Schema, model, Document } from "mongoose";

interface IMessage extends Document {
  id: Schema.Types.ObjectId;
  sender: Schema.Types.ObjectId;
  receiver: Schema.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    receiver: {
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
