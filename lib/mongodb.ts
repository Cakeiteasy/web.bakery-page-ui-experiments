import { MongoClient } from 'mongodb';

const dbName = process.env['MONGODB_DB_NAME'] ?? 'cakeiteasy-ai-dev';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  if (process.env['NODE_ENV'] === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  return new MongoClient(uri).connect();
}

let _promise: Promise<MongoClient> | null = null;

const clientPromise: Promise<MongoClient> = new Proxy({} as Promise<MongoClient>, {
  get(_target, prop) {
    if (!_promise) _promise = createClientPromise();
    const value = (_promise as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(_promise) : value;
  }
});

export { dbName };
export default clientPromise;
