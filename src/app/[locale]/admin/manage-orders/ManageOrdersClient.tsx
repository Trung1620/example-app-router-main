"use client";

import { Order, User } from "@prisma/client";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { formatPrice } from "@/utils/formatPrice";
import Heading from "../../components/Heading";
import Status from "../../components/Status";
import {
  MdAccessTimeFilled,
  MdDeliveryDining,
  MdDone,
  MdRemoveRedEye,
} from "react-icons/md";
import ActionBtn from "../../components/ActionBtn";
import { useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import moment from "moment";
import "moment/locale/vi"; // nếu cần hỗ trợ tiếng Việt
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

interface ManageOrdersClientProps {
  orders: ExtendedOrder[];
}

type ExtendedOrder = Order & {
  user: User;
};

const ManageOrdersClient: React.FC<ManageOrdersClientProps> = ({ orders }) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "vi";
  const t = useTranslations("AdminOrders");

  moment.locale(locale);

  const rows = orders.map((order) => ({
    id: order.id,
    customer: order.user.name || "N/A",
    amount: formatPrice({ vi: order.amount, en: order.amount }, locale),
    paymentStatus: order.status,
    date: moment(order.createDate).fromNow(),
    deliveryStatus: order.deliveryStatus,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 220 },
    { field: "customer", headerName: t("customer"), width: 150 },
    {
      field: "amount",
      headerName: t("amount"),
      width: 130,
      renderCell: (params) => (
        <div className="font-bold text-slate-800">{params.row.amount}</div>
      ),
    },
    {
      field: "paymentStatus",
      headerName: t("paymentStatus"),
      width: 130,
      renderCell: (params) => {
        const status = params.row.paymentStatus;
        return status === "pending" ? (
          <Status
            text={t("pending")}
            icon={MdAccessTimeFilled}
            bg="bg-slate-200"
            color="text-slate-700"
          />
        ) : (
          <Status
            text={t("completed")}
            icon={MdDone}
            bg="bg-green-200"
            color="text-green-700"
          />
        );
      },
    },
    {
      field: "deliveryStatus",
      headerName: t("deliveryStatus"),
      width: 130,
      renderCell: (params) => {
        const status = params.row.deliveryStatus;
        if (status === "pending") {
          return (
            <Status
              text={t("pending")}
              icon={MdAccessTimeFilled}
              bg="bg-slate-200"
              color="text-slate-700"
            />
          );
        } else if (status === "dispatched") {
          return (
            <Status
              text={t("dispatched")}
              icon={MdDeliveryDining}
              bg="bg-purple-200"
              color="text-purple-700"
            />
          );
        } else if (status === "delivered") {
          return (
            <Status
              text={t("delivered")}
              icon={MdDone}
              bg="bg-green-200"
              color="text-green-700"
            />
          );
        } else {
          return null;
        }
      },
    },
    {
      field: "date",
      headerName: t("date"),
      width: 130,
    },
    {
      field: "action",
      headerName: t("actions"),
      width: 200,
      renderCell: (params) => (
        <div className="flex justify-between gap-4 w-full">
          <ActionBtn
            icon={MdDeliveryDining}
            onClick={() => handleDispatch(params.row.id)}
          />
          <ActionBtn
            icon={MdDone}
            onClick={() => handleDeliver(params.row.id)}
          />
          <ActionBtn
            icon={MdRemoveRedEye}
            onClick={() => router.push(`/${locale}/order/${params.row.id}`)}
          />
        </div>
      ),
    },
  ];

  const handleDispatch = useCallback((id: string) => {
    axios
      .put("/api/order", {
        id,
        deliveryStatus: "dispatched",
      })
      .then(() => {
        toast.success(t("dispatchedSuccess"));
        router.refresh();
      })
      .catch((err) => {
        toast.error(t("error"));
        console.log(err);
      });
  }, [t, router]);

  const handleDeliver = useCallback((id: string) => {
    axios
      .put("/api/order", {
        id,
        deliveryStatus: "delivered",
      })
      .then(() => {
        toast.success(t("deliveredSuccess"));
        router.refresh();
      })
      .catch((err) => {
        toast.error(t("error"));
        console.log(err);
      });
  }, [t, router]);

  return (
    <div className="max-w-[1150px] m-auto text-xl">
      <div className="mb-4 mt-8">
        <Heading title={t("title")} center />
      </div>
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 9 },
            },
          }}
          pageSizeOptions={[9, 20]}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </div>
    </div>
  );
};

export default ManageOrdersClient;
