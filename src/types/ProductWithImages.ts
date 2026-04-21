import { Product, Review, User } from "@prisma/client";

export type ImageObject = {
  color: string;
  colorCode: string;
  url: string;
};

export type ProductWithImages = Product & {
  images: ImageObject[];
  reviews: (Review & { user: User })[];
};
