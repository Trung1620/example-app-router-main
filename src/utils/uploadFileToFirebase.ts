import { app } from "@/libs/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// utils/uploadFileToFirebase.ts
export const uploadFileToFirebase = async (
  file: File,
  folder = "products"
): Promise<string> => {
  const storage = getStorage(app);

  const id =
    (globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .replace(/[^a-zA-Z0-9_-]/g, "");

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()
    : "";

  const safeExt = ext ? `.${ext}` : "";
  const path = `${folder}/${id}${safeExt}`;

  const storageRef = ref(storage, path);

  const metadata = {
    contentType: file.type || "application/octet-stream",
  };

  await uploadBytes(storageRef, file, metadata);

  const url = await getDownloadURL(storageRef);

  return `${url}?v=${id}`;
};