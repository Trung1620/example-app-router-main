import Container from "../../components/Container";
import ProductDetails from "./ProductDetails";
import ListRating from "./ListRating";
import NullData from "../../components/NullData";
import AddRating from "./AddRating";
import getProductById from "@/actions/getProductById";
import getCurrentUser from "@/actions/getCurrentUser";

// ✅ params giờ là Promise với Next.js 15
export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { productId } = await params; // ✅ cần await

  const product = await getProductById({ productId });
  const user = await getCurrentUser();

  if (!product) {
    return <NullData title="Oops! Product with the given id does not exist" />;
  }

  return (
    <div className="p-8">
      <Container>
        <ProductDetails product={product} />
        <div className="flex flex-col mt-20 gap-4">
          <AddRating product={product} user={user} />
          <ListRating product={product} />
        </div>
      </Container>
    </div>
  );
}
