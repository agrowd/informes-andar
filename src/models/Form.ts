import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const FormSchema = new Schema({
  youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: false },
  periodo: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  status: { type: String, enum: ['BORRADOR', 'EN_REVISION', 'APROBADO'], default: 'BORRADOR' },
  version: { type: Number, default: 1 }
}, { timestamps: true });

export type Form = InferSchemaType<typeof FormSchema> & { _id: any };

export const FormModel: Model<Form> = mongoose.models.Form || mongoose.model<Form>('Form', FormSchema);

