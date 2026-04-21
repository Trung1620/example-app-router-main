export async function uploadFileToCloudinary(file: File) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
    const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "seedsbiz/products";

    if (!cloudName || !uploadPreset) {
        throw new Error("Missing Cloudinary env (CLOUD_NAME / UPLOAD_PRESET)");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);
    form.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Upload Cloudinary failed");

    return String(data.secure_url);
}