import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client, type CORSRule } from '@aws-sdk/client-s3';

const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

const incoming = process.argv.includes('--incoming');
const bucket = incoming ? process.env.R2_INCOMING_BUCKET || 'epapers-incoming' : process.env.R2_PROFILE_BUCKET || 'profile';
const endpoint = process.env.R2_ENDPOINT!;
const client = new S3Client({
  region: 'auto', endpoint,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

const origins = [
  'https://epapertz.vercel.app',
  'https://epapertz-contributor.vercel.app',
  'https://epapertz-lecturer.vercel.app',
  'https://epapertz-admin.vercel.app',
  'https://epapers.co.tz',
  'https://www.epapers.co.tz',
  'https://contributor.epapers.co.tz',
  'https://lecturer.epapers.co.tz',
  'https://console.epapers.co.tz',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
];
const uploadRule: CORSRule = {
  ID: incoming ? 'epapers-incoming-upload' : 'epapers-profile-upload',
  AllowedOrigins: origins,
  AllowedMethods: ['PUT'],
  AllowedHeaders: ['Content-Type', 'If-None-Match'],
  ExposeHeaders: ['ETag'],
  MaxAgeSeconds: 3600,
};

let existing: CORSRule[] = [];
try {
  existing = (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules || [];
} catch (error) {
  if ((error as { name?: string }).name !== 'NoSuchCORSConfiguration') throw error;
}

const rules = [uploadRule, ...existing.filter(rule => rule.ID !== uploadRule.ID)];
if (process.argv.includes('--apply')) {
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
  console.log(`Updated CORS for bucket ${bucket}; preserved ${rules.length - 1} other rule(s).`);
} else {
  console.log(`Dry run: bucket ${bucket}; would add the ${incoming ? 'PDF' : 'profile'} PUT rule and preserve ${rules.length - 1} other rule(s). Pass --apply to update.`);
}

if (process.argv.includes('--apply')) {
  const confirmed = (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules || [];
  const applied = confirmed.find(rule => rule.ID === uploadRule.ID);
  const headers = new Set(applied?.AllowedHeaders?.map(header => header.toLowerCase()));
  if (!applied || !applied.AllowedOrigins?.includes('https://epapertz-contributor.vercel.app') || !applied.AllowedMethods?.includes('PUT') || !headers.has('content-type') || !headers.has('if-none-match'))
    throw new Error(`The ${bucket} bucket CORS rule could not be verified.`);
  console.log('Verified contributor origin, PUT method, and signed request headers in the saved R2 policy.');
}
