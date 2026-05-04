import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const CirculoSchema = new Schema({
  nombre: { type: String, required: true },
  vinculo: { type: String, required: true }
}, { _id: false });

const YoungSchema = new Schema({
  nombreCompleto: { type: String, required: true },
  dni: { type: String },
  taller: { type: String },
  fechaNacimiento: { type: Date },
  circuloApoyo: { type: [CirculoSchema], default: [] },
  assignedFacilitators: { type: [Schema.Types.ObjectId], ref: 'User', default: [] }
}, { timestamps: true });

export type Young = InferSchemaType<typeof YoungSchema> & { _id: any };

export const YoungModel: Model<Young> = mongoose.models.Young || mongoose.model<Young>('Young', YoungSchema);

