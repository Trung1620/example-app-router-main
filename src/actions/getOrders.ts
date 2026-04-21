import prisma from "../../libs/prismadb";


export default async function getOrders(){
    try {
        const orders = await prisma.quote.findMany({
            include:{
                customer: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return orders
    } catch (error: any) {
        throw new Error(error)
    }
}