import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  role: { type: String, enum: ['ADMIN', 'COORDINACION', 'FACILITADOR'], default: 'FACILITADOR' }
}, { timestamps: true });

export type User = InferSchemaType<typeof UserSchema> & { _id: any };

export const UserModel: Model<User> = mongoose.models.User || mongoose.model<User>('User', UserSchema);

