import Stripe from "stripe";
import prisma from "../../../../libs/prismadb";
import { NextResponse } from "next/server";
import { CartProductType } from "../../../app/[locale]/product/[productId]/ProductDetails";
import getCurrentUser from "@/actions/getCurrentUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});

const calculateOrderAmount = (items: CartProductType[]) => {
  const totalPrice = items.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);

  return Math.floor(totalPrice);
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { items, payment_intent_id } = body;

  const total = calculateOrderAmount(items) * 100; // Stripe dùng đơn vị cent
  const orderData = {
    user: { connect: { id: currentUser.id } },
    amount: total,
    currency: "usd",
    status: "pending",
    deliveryStatus: "pending",
    paymentIntentId: payment_intent_id,
    products: items,
  };

  try {
    if (payment_intent_id) {
      const current_intent = await stripe.paymentIntents.retrieve(payment_intent_id);

      if (current_intent) {
        const updated_intent = await stripe.paymentIntents.update(payment_intent_id, {
          amount: total,
        });

        const existing_order = await prisma.order.findFirst({
          where: { paymentIntentId: payment_intent_id },
        });

        if (!existing_order) {
          return NextResponse.error();
        }

        await prisma.order.update({
          where: { paymentIntentId: payment_intent_id },
          data: {
            amount: total,
            products: items,
          },
        });

        return NextResponse.json({ paymentIntent: updated_intent });
      }
    } else {
      // Tạo mới intent & order
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });

      orderData.paymentIntentId = paymentIntent.id;

      await prisma.order.create({ data: orderData });

      return NextResponse.json({ paymentIntent });
    }

    return NextResponse.error();
  } catch (error) {
    console.error("❌ Stripe error:", error);
    return new NextResponse("Stripe payment error", { status: 500 });
  }
}
