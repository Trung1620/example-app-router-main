"use client";

interface BackDropProps {
  onClick: () => void;
}

const BackDrop: React.FC<BackDropProps> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm"
    />
  );
};

export default BackDrop;
