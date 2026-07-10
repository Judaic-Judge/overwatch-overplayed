import Link from "next/link";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type JoinPageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

type InviteInfo = {
  invite_code: string;
  team_id: string;
  team_name: string;
  role: "coach" | "assistant_coach" | "player";
  expires_at: string;
};

async function acceptInvite(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const inviteCode = String(formData.get("inviteCode") || "").trim();

  if (!inviteCode) {
    return;
  }

  const { error } = await supabase.rpc("accept_team_invite", {
    invite_code_input: inviteCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

export default function JoinPage(props: JoinPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-3xl">
            <p className="text-zinc-400">Loading invite...</p>
          </div>
        </main>
      }
    >
      <JoinContent params={props.params} />
    </Suspense>
  );
}

async function JoinContent({ params }: JoinPageProps) {
  const { inviteCode } = await params;
  const normalizedInviteCode = inviteCode.toUpperCase();

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: inviteData, error: inviteError } = await supabase.rpc(
    "get_team_invite",
    {
      invite_code_input: normalizedInviteCode,
    },
  );

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const invite = Array.isArray(inviteData)
    ? (inviteData[0] as InviteInfo | undefined)
    : undefined;

  if (!invite) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-block text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Dashboard
        </Link>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-cyan-400">Team Invite</p>

          <h1 className="mt-2 text-3xl font-bold">
            Join {invite.team_name}
          </h1>

          <p className="mt-3 text-zinc-400">
            You are accepting an invite as a{" "}
            <span className="font-semibold text-zinc-200">{invite.role}</span>.
          </p>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-200">Invite code:</span>{" "}
              <span className="font-mono text-cyan-400">
                {invite.invite_code}
              </span>
            </p>
            <p>
              <span className="text-zinc-200">Expires:</span>{" "}
              {new Date(invite.expires_at).toLocaleString()}
            </p>
          </div>

          <form action={acceptInvite} className="mt-6">
            <input
              type="hidden"
              name="inviteCode"
              value={invite.invite_code}
            />

            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Accept Invite
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}