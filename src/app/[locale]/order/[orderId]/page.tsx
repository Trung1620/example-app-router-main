import Container from "../../components/Container";
import OrderDetails from "./OrderDetails";
import getOrderById from "@/actions/getOrderById";
import NullData from "../../components/NullData";

export const dynamic = "force-dynamic";

type Params = Promise<{
  locale: string;      // nếu bạn đang dùng đa ngôn ngữ
  orderId: string;
}>;

export default async function OrderPage({ params }: { params: Params }) {
  const { orderId } = await params;

  const order = await getOrderById({ orderId });

  if (!order) {
    return <NullData title="No order found" />;
  }

  return (
    <div className="p-8">
      <Container>
        <OrderDetails order={order} />
      </Container>
    </div>
  );
}
