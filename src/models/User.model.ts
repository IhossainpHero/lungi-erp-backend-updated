import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";
import { IUser, UserRole } from "../types/index";

export interface IUserDocument extends Omit<IUser, "_id">, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["admin", "moderator", "staff", "party"] as UserRole[],
      default: "staff",
    },
    // যেই পার্টির নম্বর দিয়ে রেজিস্ট্রেশন হয়েছে, তার সাথে লিংক
    partyId: {
      type: Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUserDocument>("User", UserSchema);
