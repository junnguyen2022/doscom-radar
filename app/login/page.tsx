import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoginButton } from "./LoginButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const next = sp.next ?? "/";

  if (user) redirect(next);

  return (
    <main className="mx-auto max-w-md py-10">
      <PageHeader
        eyebrow="Sign in"
        title="Đăng nhập Agent Radar"
        description="Để dùng Watchlist server-side + Decisions, bạn cần đăng nhập bằng GitHub."
      />

      <Card className="p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Continue with GitHub</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Watchlist + Decisions của bạn sẽ sync giữa devices.
          </p>
        </div>

        <LoginButton next={next} />

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Bạn vẫn dùng được dashboard, trending, collections mà không cần đăng
          nhập — chỉ Watchlist + Decisions cần auth.
        </p>
      </Card>
    </main>
  );
}
