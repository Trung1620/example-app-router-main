// utils/deleteFileFromFirebase.ts

export const deleteFileFromFirebase = async (url: string): Promise<void> => {
   const { app: firebaseApp } = await import('../../libs/firebase');
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
  
    const storage = getStorage(firebaseApp);
    const imageRef = ref(storage, url);
  
    await deleteObject(imageRef);
  };
  