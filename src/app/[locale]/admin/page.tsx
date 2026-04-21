// src/app/[locale]/admin/page.tsx
import Link from 'next/link';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {cookies} from 'next/headers';
import type {AppLocale} from '@/i18n';

import Container from '../components/Container';
import UploadJsonButton from '../components/UploadJsonButton';

import getProducts from '@/actions/getProducts';
import getOrders from '@/actions/getOrders';
import getUsers from '@/actions/getUsers';
import getGraphData from '@/actions/getGraphData';
import Summary from './Summary';
import getDashboardAnalytics from '@/actions/getDashboardAnalytics';
// import BarGraph from './BarGraph';

type AdminPageProps = {
  params: Promise<{locale: AppLocale}>;
};

function AdminCard({
  href,
  title,
  desc,
  tone = 'gray',
  disabled = false
}: {
  href: string;
  title: string;
  desc: string;
  tone?: 'teal' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'gray';
  disabled?: boolean;
}) {
  const toneMap: Record<string, string> = {
    teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  };

  const disabledClass = disabled ? 'opacity-70 ring-1 ring-amber-300' : '';

  return (
    <Link
      href={href}
      className={[
        'group block rounded-xl border p-6 shadow-sm transition',
        'hover:shadow-md',
        toneMap[tone],
        disabledClass
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{desc}</p>
        </div>
        <span className="shrink-0 text-gray-500 transition group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-10 max-w-[1150px]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default async function AdminPage({params}: AdminPageProps) {
  const {locale} = await params;

  const messages = await getMessages({locale});
  const base = `/${locale}/admin`;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_org_id')?.value || null;
  const activeOrgName = cookieStore.get('active_org_name')?.value || null;
  const hasActiveOrg = Boolean(activeOrgId);

  const [products, orders, users, graphData, dashboardData] = await Promise.all([
    getProducts({category: null, locale}),
    getOrders(),
    getUsers(),
    getGraphData(),
    activeOrgId ? getDashboardAnalytics(activeOrgId) : null
  ]);

  const selectOrgBase = `/${locale}/admin/select-org`;
  const selectOrgWithNext = (next: string, force = false) =>
    `${selectOrgBase}?next=${encodeURIComponent(next)}${force ? '&force=1' : ''}`;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="pb-16 pt-8">
        <Container>
          <div className="mx-auto max-w-[1150px]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">Admin</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Quản lý website, báo giá, kho, và dữ liệu nội dung.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${locale}`}
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Mở website
                </Link>

                <Link
                  href={selectOrgWithNext(base, true)}
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {hasActiveOrg ? 'Đổi cơ sở' : 'Chọn cơ sở'}
                </Link>

                <Link
                  href={
                    hasActiveOrg
                      ? `${base}/quotes`
                      : selectOrgWithNext(`${base}/quotes`)
                  }
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Báo giá
                </Link>
              </div>
            </div>

            {!hasActiveOrg ? (
              <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-amber-900">
                      Bạn chưa chọn cơ sở làm việc
                    </h2>
                    <p className="mt-1 text-sm text-amber-800">
                      Hãy chọn cơ sở trước khi vào báo giá, kho hoặc các chức năng
                      quản trị theo tổ chức.
                    </p>
                  </div>

                  <Link
                    href={selectOrgWithNext(base, true)}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Đi tới chọn cơ sở
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-emerald-900">
                      Cơ sở đang chọn
                    </h2>
                    <p className="mt-1 text-sm text-emerald-800">
                      {activeOrgName || activeOrgId}
                    </p>
                  </div>

                  <Link
                    href={selectOrgWithNext(base, true)}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    Đổi cơ sở
                  </Link>
                </div>
              </div>
            )}

            {dashboardData && (
              <div className="mt-8">
                <Summary data={dashboardData} />
              </div>
            )}
            {/* <div className="mt-4">
              <BarGraph data={graphData} />
            </div> */}
          </div>

          <Section
            title="Website"
            subtitle="Các cấu hình hiển thị ngoài trang chủ."
          >
            <AdminCard
              href={`${base}/homebanner`}
              title="Home Banner"
              desc="Chọn sản phẩm cho carousel trang chủ, sắp xếp thứ tự hiển thị."
              tone="teal"
            />
            <AdminCard
              href={`/${locale}`}
              title="Xem nhanh trang chủ"
              desc="Kiểm tra giao diện homepage sau khi cập nhật banner & nội dung."
              tone="gray"
            />
          </Section>

          <Section
            title="Nội dung"
            subtitle="Quản lý bài viết, dữ liệu JSON (nếu bạn đang dùng)."
          >
            <AdminCard
              href={`${base}/post-blog`}
              title="Đăng bài Blog mới"
              desc="Tạo bài blog mới để chia sẻ nội dung và SEO."
              tone="green"
            />
            <AdminCard
              href={`${base}/manage-blog`}
              title="Quản lý Blog"
              desc="Chỉnh sửa hoặc xoá các bài viết đã đăng."
              tone="blue"
            />
          </Section>

          <div className="mx-auto mt-4 max-w-[1150px]">
            <UploadJsonButton />
          </div>

          <Section
            title="Kinh doanh & Bán hàng"
            subtitle="Quy trình: Báo giá → Giao hàng → Thu tiền."
          >
            <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/quotes`
                  : selectOrgWithNext(`${base}/quotes`)
              }
              title="Quản lý Báo giá"
              desc="Xem danh sách báo giá, tạo mới, in PDF và theo dõi trạng thái đơn hàng."
              tone="purple"
              disabled={!hasActiveOrg}
            />
             <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/customers`
                  : selectOrgWithNext(`${base}/customers`)
              }
              title="CRM Khách hàng"
              desc="Quản lý thông tin khách khách hàng, lịch sử liên hệ và phân nhóm."
              tone="teal"
              disabled={!hasActiveOrg}
            />
          </Section>

          <Section
            title="Kho & Vận hành"
            subtitle="Nhập/Xuất kho, quản lý vị trí hàng hóa và tồn kho."
          >
            <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/stock/balance`
                  : selectOrgWithNext(`${base}/stock/balance`)
              }
              title="Tồn kho thời gian thực"
              desc="Xem số lượng tồn chính xác theo từng kho hàng và chi nhánh."
              tone="gray"
              disabled={!hasActiveOrg}
            />
            <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/stock/in`
                  : selectOrgWithNext(`${base}/stock/in`)
              }
              title="Nhập kho (Stock In)"
              desc="Tạo phiếu nhập kho để tăng số lượng sản phẩm trong hệ thống."
              tone="orange"
              disabled={!hasActiveOrg}
            />
            <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/warehouses`
                  : selectOrgWithNext(`${base}/warehouses`)
              }
              title="Quản lý Kho bãi"
              desc="Khai báo vị trí kho, địa chỉ và thông tin kho hàng."
              tone="blue"
              disabled={!hasActiveOrg}
            />
             <AdminCard
              href={
                hasActiveOrg
                  ? `${base}/manage-products`
                  : selectOrgWithNext(`${base}/manage-products`)
              }
              title="Danh mục sản phẩm"
              desc="Quản lý SKU, giá bán, giá vốn và thông tin kỹ thuật sản phẩm."
              tone="green"
              disabled={!hasActiveOrg}
            />
          </Section>
        </Container>
      </div>
    </NextIntlClientProvider>
  );
}