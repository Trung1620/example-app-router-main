"use client";

import { Review, User } from "@prisma/client";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

interface RatingProps {
  reviews: (Review & { user: User })[] | undefined;
}

const Rating: React.FC<RatingProps> = ({ reviews }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <AiOutlineStar key={i} size={16} />
        ))}
      </div>
    );
  }

  const totalStars = reviews.reduce((acc, review) => acc + review.rating, 0);
  const avg = totalStars / reviews.length;

  return (
    <div className="flex text-yellow-500">
      {[...Array(5)].map((_, i) =>
        i < Math.round(avg) ? (
          <AiFillStar key={i} size={16} />
        ) : (
          <AiOutlineStar key={i} size={16} />
        )
      )}
    </div>
  );
};

export default Rating;
