'use client';

type Props = {
  deliveryNumber: string;
};

export default function DeleteDeliveryButton({ deliveryNumber }: Props) {
  return (
    <button
      type="submit"
      className="px-3 py-2 text-xs rounded-lg border text-red-600 hover:bg-red-50"
      onClick={(e) => {
        if (!confirm(`Xoá phiếu giao ${deliveryNumber}?`)) {
          e.preventDefault();
        }
      }}
    >
      Xoá
    </button>
  );
}
