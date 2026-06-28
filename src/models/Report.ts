import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const CommentSchema = new Schema({
  sectionKey: { type: String, required: true },
  fragmentId: { type: String, required: true },
  text: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' }
}, { _id: true });

const ReportSchema = new Schema({
  youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: true },
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  periodo: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  html: { type: String },
  pdfUrl: { type: String },
  trazabilidad: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['BORRADOR', 'EN_REVISION', 'CAMBIOS_SOLICITADOS', 'APROBADO'], default: 'BORRADOR' },
  version: { type: Number, default: 1 },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: { type: [CommentSchema], default: [] },
  originalData: { type: Schema.Types.Mixed },
  editedDocxBase64: { type: String },
  editedDocxFilename: { type: String },
  editedAt: { type: Date }
}, { timestamps: true });

export type Report = InferSchemaType<typeof ReportSchema> & { _id: any };

export const ReportModel: Model<Report> = mongoose.models.Report || mongoose.model<Report>('Report', ReportSchema);

