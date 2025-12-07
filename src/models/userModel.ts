import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
  id: Schema.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  profilePicture: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },

    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      minlength: 5,
      maxlength: 100,
    },

    profilePicture: {
      type: String,
      required: false,
      default:
        "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg",
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = model<IUser>("User", userSchema);

export { IUser, UserModel };
