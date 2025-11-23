import { requireAdmin } from "@/utils/requireAdmin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin(); // enforce admin access

  return <>{children}</>;
}
