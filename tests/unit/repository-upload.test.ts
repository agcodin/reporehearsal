import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { analyzeUploadedFiles, extractZipUpload, RepositoryUploadError, validateFolderUpload } from "../../src/repositories/upload/analyzer";

describe("local repository uploads", () => {
  it("extracts a supported ZIP, strips the common root, and excludes secrets", () => {
    const zip = zipSync({
      "billing/package.json": strToU8('{"scripts":{"test":"vitest run"},"dependencies":{"express":"5","@prisma/client":"6"},"devDependencies":{"typescript":"5","vitest":"3"}}'),
      "billing/package-lock.json": strToU8("{}"),
      "billing/src/server.ts": strToU8("export const app = true"),
      "billing/tests/billing.test.ts": strToU8("test('billing', () => {})"),
      "billing/prisma/schema.prisma": strToU8('datasource db { provider = "postgresql" }'),
      "billing/.env": strToU8("DATABASE_URL=secret"),
      "billing/node_modules/pkg/index.js": strToU8("generated"),
    });
    const extracted = extractZipUpload(zip);
    expect(extracted.fileCount).toBe(7);
    expect(extracted.files.map(file => file.path)).toContain("tests/billing.test.ts");
    expect(extracted.files.map(file => file.path)).not.toContain(".env");
    const analysis = analyzeUploadedFiles("Billing", extracted.files, extracted.fileCount);
    expect(analysis.stack).toMatchObject({ language: "TypeScript", framework: "Express", database: "PostgreSQL", orm: "Prisma", testFramework: "Vitest", packageManager: "npm" });
    expect(analysis.compatibleIncidentIds).toContain("repository-generated-v1");
    expect(analysis.warnings[0]).toMatch(/excluded/);
  });

  it("rejects traversal paths from folders and ZIP archives", () => {
    expect(() => validateFolderUpload([{ path: "../secret.ts", bytes: strToU8("secret") }])).toThrowError(RepositoryUploadError);
    const zip = zipSync({ "../secret.ts": strToU8("secret") });
    expect(() => extractZipUpload(zip)).toThrowError(/unsafe file path/);
  });

  it("requires at least one safe analyzable text file", () => {
    const files = validateFolderUpload([{ path: "project/logo.png", bytes: new Uint8Array([0, 1, 2]) }]);
    expect(() => analyzeUploadedFiles("Images", files, 1)).toThrowError(/No supported source/);
  });

  it("enforces the active tier capacity instead of a fixed global limit", () => {
    const files = [{ path: "project/src/index.ts", bytes: strToU8("export const ready = true") }];
    expect(() => validateFolderUpload(files, { repositoryUploadBytes: 8, repositoryFiles: 10, maxTextFileBytes: 8 })).toThrowError(/exceeds the 0 MB analysis limit/);
    expect(validateFolderUpload(files, { repositoryUploadBytes: 1_000, repositoryFiles: 10, maxTextFileBytes: 1_000 })).toHaveLength(1);
  });
});
