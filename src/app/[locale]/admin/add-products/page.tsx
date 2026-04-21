import getCurrentUser from "@/actions/getCurrentUser";
import Container from "../../components/Container";
import FormWrap from "../../components/FormWrap";
import NullData from "../../components/NullData";
import AddProductForm from "./AddProductForm";

export default async function AddProductsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return <NullData title="Oops! Access denied" />;
  }

  return (
    <div className="p-8">
      <Container>
        <FormWrap>
          <AddProductForm />
        </FormWrap>
      </Container>
    </div>
  );
}
