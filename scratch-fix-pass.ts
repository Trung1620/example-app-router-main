import prismadb from "./libs/prismadb";
import bcrypt from "bcrypt";

async function main() {
  const users = await prismadb.user.findMany();
  console.log("Users in DB:", users.map(u => ({ email: u.email, hasHashedPassword: !!u.hashedPassword })));
  
  // Bạn có thể đổi email bên dưới thành email của bạn
  const myEmail = "admin@seedsbiz.com"; 
  const newPassword = "123456"; // Mật khẩu bạn muốn đặt
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const updatedUser = await prismadb.user.update({
    where: { email: myEmail },
    data: { hashedPassword }
  });
  
  console.log("Updated user:", updatedUser.email);
}

main();
