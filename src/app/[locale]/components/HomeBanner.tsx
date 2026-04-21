import Image from "next/image";

const HomeBanner = () => {
  return (
    <div className="relative bg-gradient-to-r from-emerald-700 to-emerald-400 mb-8">
      <div className="mx-auto px-8 py-3 flex flex-col gap-2 md:flex-row items-center justify-evenly">
        <div className="mb-5 md:mb-0 text-center">
          <h1 className="text-3xl md:text-6xl font-bold text-white mb-4 font-sans">
            Tết 2025
          </h1>
          <p className="text-lg md:text-xl text-white mb-2 font-sans">
           Tận hưởng những sản phẩm thân thiện môi trường
          </p>
          <p className="text-xl md:text-4xl text-yellow-200 font-bold font-sans">
            GIẢM TỚI 50%
          </p>
        </div>
        <div className="w-1/3 relative aspect-video">
          <Image
            src="/banner-image.png"
            fill
            alt="Banner Image"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default HomeBanner;
