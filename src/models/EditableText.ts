import mongoose, { InferSchemaType } from 'mongoose';

const EditableTextSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true },
		text: { type: String, required: true },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	},
	{ timestamps: true }
);

export type EditableText = InferSchemaType<typeof EditableTextSchema> & { _id: any };

export const EditableTextModel =
	(mongoose.models.EditableText as mongoose.Model<EditableText>) ||
	mongoose.model<EditableText>('EditableText', EditableTextSchema);



