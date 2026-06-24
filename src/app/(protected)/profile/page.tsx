import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, leetcodeUsername: true, createdAt: true },
  });

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and LeetCode connection</p>
      </div>

      <ProfileForm
        initialName={user?.name ?? ""}
        initialLeetcode={user?.leetcodeUsername ?? ""}
        email={user?.email ?? ""}
      />

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-sm text-gray-500">
        <p>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en", { dateStyle: "long" }) : "—"}</p>
      </div>
    </div>
  );
}
