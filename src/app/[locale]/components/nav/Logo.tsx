'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

const Logo = () => {
  const router = useRouter();
  const locale = useLocale();

  const handleClick = () => {
    router.push(`/${locale}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer flex items-center gap-2">
      {/* <Image
        src="/logo.jpg" // ✅ Đổi logo nếu cần (nếu bạn dùng .png hoặc .jpg)
        alt="TrangBamboo"
        width={36}
        height={36}
        className="object-contain"
      /> */}
      <span className="text-m font-bold text-emerald-800">TrangBamboo</span>
    </div>
  );
};

export default Logo;
