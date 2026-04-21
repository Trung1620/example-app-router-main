import NextAuth from "next-auth";
import { authOptions } from "../../../../../libs/authOptions"; // ✅ đường dẫn đúng đến file vừa tách


const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };