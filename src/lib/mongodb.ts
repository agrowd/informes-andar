import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
let clientPromise: Promise<MongoClient> | undefined;

if (uri) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export { clientPromise };


