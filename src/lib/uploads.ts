import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local file storage for KYC documents and payment proofs.
 *
 * PRODUCTION NOTE: this writes to the container's filesystem, which is fine for
 * a single long-lived server and wrong for serverless or multi-instance
 * deployments — files written by one instance are invisible to the next, and
 * the disk is wiped on redeploy. Before going live, replace `saveUpload` with a
 * signed-URL upload straight to S3/R2 and store the object key instead of a
 * path. Nothing else in the codebase needs to change: everywhere else treats
 * the return value as an opaque string.
 *
 * These files contain identity documents. They are written outside `public/` so
 * they are never served statically — retrieval must go through an authorised
 * route that checks who is asking.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "private-uploads");

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export interface SavedUpload {
  /** Opaque reference stored in the database. */
  key: string;
  size: number;
  contentType: string;
}

export async function saveUpload(
  file: File,
  options: { userId: string; kind: string },
): Promise<SavedUpload> {
  if (!file || file.size === 0) {
    throw new UploadError("No file was provided.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_BYTES / 1024 / 1024} MB.`,
    );
  }

  const extension = ALLOWED[file.type];
  if (!extension) {
    throw new UploadError(
      "Upload a JPG, PNG, WebP or PDF. Other formats are not accepted.",
    );
  }

  // Filename is generated, never derived from user input — a supplied name is
  // a path-traversal vector and leaks nothing useful anyway.
  const name = `${options.kind}-${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  const directory = path.join(UPLOAD_ROOT, options.userId);

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, name),
    Buffer.from(await file.arrayBuffer()),
    { mode: 0o600 },
  );

  return {
    key: `${options.userId}/${name}`,
    size: file.size,
    contentType: file.type,
  };
}

/** Resolves a stored key back to an absolute path, refusing anything outside the root. */
export function resolveUploadPath(key: string): string {
  const resolved = path.resolve(UPLOAD_ROOT, key);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
    throw new UploadError("Invalid file reference.");
  }
  return resolved;
}

export function isOptionalFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
