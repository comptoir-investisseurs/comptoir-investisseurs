import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { hasR2 } from "./env";

/**
 * Les PDF CRONOSTIC vivent dans un bucket R2 **privé**. L'URL du bucket n'est
 * jamais exposée : le téléchargement passe toujours par une URL signée à durée
 * de vie courte, générée après vérification des droits.
 *
 * Sans identifiants R2, les fichiers sont écrits dans `.local-storage/` et
 * servis par la route de téléchargement — même contrôle d'accès, stockage local.
 */

const LOCAL_ROOT = path.join(process.cwd(), ".local-storage");

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function guideObjectKey(caliberSlug: string): string {
  return `premium/guides/${caliberSlug}.pdf`;
}

export function previewObjectKey(caliberSlug: string): string {
  return `preview/guides/${caliberSlug}-extrait.pdf`;
}

function localPath(key: string): string {
  // Les clés viennent du back-office : on neutralise toute remontée de chemin.
  const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(LOCAL_ROOT, safe);
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (hasR2) {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }

  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

/** URL signée temporaire, ou `null` en stockage local (la route sert le flux). */
export async function signedDownloadUrl(key: string, filename: string): Promise<string | null> {
  if (!hasR2) return null;

  const ttl = Number(process.env.R2_SIGNED_URL_TTL ?? 300);
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
    }),
    { expiresIn: Number.isFinite(ttl) && ttl > 0 ? ttl : 300 },
  );
}

export async function readObject(key: string): Promise<Buffer | null> {
  if (hasR2) {
    const res = await s3().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  }

  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

export { hasR2 };
