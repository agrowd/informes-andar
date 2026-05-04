import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const AuditLogSchema = new Schema({
  entityType: { type: String, enum: ['USER', 'YOUNG', 'FORM', 'REPORT'], required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, required: true }, // CREATE, UPDATE, SUBMIT, APPROVE, GENERATE_PDF
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  meta: { type: Schema.Types.Mixed }
}, { timestamps: true });

export type AuditLog = InferSchemaType<typeof AuditLogSchema> & { _id: any };

export const AuditLogModel: Model<AuditLog> = mongoose.models.AuditLog || mongoose.model<AuditLog>('AuditLog', AuditLogSchema);

