export type ComposerAttachment = Readonly<{
  id: string;
  previewUrl: string;
  state: "uploading" | "done" | "error";
}>;
