import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={session.user.name ?? session.user.email ?? "Student"} />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</div>
    </div>
  );
}
