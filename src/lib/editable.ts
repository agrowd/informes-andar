import { connectToDB } from './db';
import { EditableTextModel } from '@/models/EditableText';

export async function getEditableMapByPrefix(prefix: string): Promise<Record<string, string>> {
  if (!process.env.MONGODB_URI) return {};
  await connectToDB();
  const docs = await EditableTextModel.find({ key: { $regex: `^${prefix}` } }).lean();
  const out: Record<string, string> = {};
  (docs || []).forEach((d:any) => { out[d.key] = d.text; });
  return out;
}

export async function getEditable(key: string): Promise<string | null> {
  if (!process.env.MONGODB_URI) return null;
  await connectToDB();
  const doc = await EditableTextModel.findOne({ key }).lean();
  return doc?.text ?? null;
}



