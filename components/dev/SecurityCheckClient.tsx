"use client";

import { useEffect, useMemo, useState } from "react";

type TestItem = {
  id: string;
  title: string;
  account: string;
  steps: string[];
  expected: string;
};

type TestGroup = {
  id: string;
  title: string;
  description: string;
  items: TestItem[];
};

const TEST_GROUPS: TestGroup[] = [
  {
    id: "coach-core",
    title: "Coach Account Test",
    description:
      "Use the account that owns or coaches a team. This account should be able to manage the coaching workflow.",
    items: [
      {
        id: "coach-create-team",
        title: "Coach can create a team",
        account: "Coach account",
        steps: [
          "Go to /dashboard.",
          "Use Create a New Team.",
          "Create a test team.",
        ],
        expected:
          "The team appears under My Coaching Roles and My Teams. The creator is treated as Coach/owner.",
      },
      {
        id: "coach-create-plan",
        title: "Coach can create a plan",
        account: "Coach account",
        steps: [
          "Go to /dashboard.",
          "Use Create Plan.",
          "Create a test plan.",
        ],
        expected:
          "The plan appears under Active Coach Plans and can be opened in /planner/[planId].",
      },
      {
        id: "coach-manage-plan",
        title: "Coach can manage plans",
        account: "Coach account",
        steps: [
          "Open a plan.",
          "Rename it.",
          "Duplicate it.",
          "Move it to a coaching team.",
          "Archive it.",
          "Restore it.",
        ],
        expected:
          "Each action completes successfully and the dashboard separates active and archived plans correctly.",
      },
      {
        id: "coach-invite-player",
        title: "Coach can create and revoke player invites",
        account: "Coach account",
        steps: [
          "Go to /dashboard.",
          "Find Player Invite Links.",
          "Create an invite for a coaching team.",
          "Open or copy the invite link.",
          "Revoke the invite.",
        ],
        expected:
          "Invite is created, visible, testable, and then disappears or becomes unusable after revoke.",
      },
      {
        id: "coach-roster-management",
        title: "Coach can manage roster roles",
        account: "Coach account",
        steps: [
          "Invite a player account to a team.",
          "Return to the coach account.",
          "Find the player in Team Rosters.",
          "Change the player to Assistant Coach.",
          "Change them back to Player.",
        ],
        expected:
          "Role updates save correctly. The coach cannot remove themselves or the protected owner.",
      },
      {
        id: "coach-schedule-session",
        title: "Coach can schedule a session",
        account: "Coach account",
        steps: [
          "Make sure there is at least one active plan.",
          "Go to Schedule Session.",
          "Select a coaching team.",
          "Select an active plan.",
          "Choose a future date/time.",
          "Submit.",
        ],
        expected:
          "The scheduled session appears under Coach Sessions.",
      },
      {
        id: "coach-start-end-live",
        title: "Coach can start and end a live room",
        account: "Coach account",
        steps: [
          "Find a scheduled coach session.",
          "Click Start Live Room.",
          "Confirm the live room loads.",
          "Move through presentation steps.",
          "End the session.",
        ],
        expected:
          "Live room opens, step changes sync, and ending the session changes it to ended/reviewable.",
      },
      {
        id: "coach-edit-aar",
        title: "Coach can edit AAR notes",
        account: "Coach account",
        steps: [
          "Go to /sessions.",
          "Open a completed session.",
          "Fill out Public Summary, What Went Well, Needs Improvement, Next Session Goals, Replay URL, and Private Coach Notes.",
          "Save AAR.",
        ],
        expected:
          "AAR saves successfully. Coach sees private notes and player-facing preview.",
      },
    ],
  },
  {
    id: "player-restrictions",
    title: "Player Account Test",
    description:
      "Use an account that is only a Player on the test team. This account should be able to attend and review, but not manage.",
    items: [
      {
        id: "player-dashboard",
        title: "Player sees player workspace",
        account: "Player account",
        steps: [
          "Sign in as a player assigned to a team.",
          "Go to /dashboard.",
          "Review My Player Roles and Player Workspace.",
        ],
        expected:
          "The player sees their player teams and sessions, but does not get management controls for that team.",
      },
      {
        id: "player-cannot-roster",
        title: "Player cannot manage roster",
        account: "Player account",
        steps: [
          "Go to /dashboard.",
          "Look for Team Rosters management controls for the team where they are only a Player.",
        ],
        expected:
          "Player cannot update roles, remove members, or create invites for that team.",
      },
      {
        id: "player-cannot-start-live",
        title: "Player cannot start live rooms",
        account: "Player account",
        steps: [
          "Go to /dashboard or /sessions.",
          "Find a scheduled session where they are only a Player.",
        ],
        expected:
          "Player can join if the room is live, but cannot start the live room.",
      },
      {
        id: "player-can-join-live",
        title: "Player can join assigned live room",
        account: "Player account",
        steps: [
          "Have the coach start a live room for the player's team.",
          "Sign in as the player.",
          "Go to /dashboard or /sessions.",
          "Click Join Live Room.",
        ],
        expected:
          "The live room loads in read-only player mode and follows coach-controlled steps.",
      },
      {
        id: "player-readonly-live",
        title: "Player live room is read-only",
        account: "Player account",
        steps: [
          "Join a live room as player.",
          "Look for coach controls.",
          "Try to change presentation state if any controls appear.",
        ],
        expected:
          "Player does not see coach controls and cannot change current step, payload progress, or coach message.",
      },
      {
        id: "player-aar-public-only",
        title: "Player sees public AAR only",
        account: "Player account",
        steps: [
          "Go to /sessions.",
          "Open a completed session with saved AAR notes.",
          "Review visible sections.",
        ],
        expected:
          "Player sees Summary, What Went Well, Needs Improvement, Next Session Goals, and Replay Link. Player does not see Private Coach Notes.",
      },
      {
        id: "player-cannot-edit-aar",
        title: "Player cannot edit AAR",
        account: "Player account",
        steps: [
          "Open a completed session review.",
          "Look for editable text fields or Save AAR button.",
        ],
        expected:
          "Player sees read-only review content only. No AAR editor appears.",
      },
    ],
  },
  {
    id: "wrong-team",
    title: "Wrong-Team Account Test",
    description:
      "Use an account that is not a member of the team being presented. It should not receive access.",
    items: [
      {
        id: "wrong-team-live-room",
        title: "Wrong-team account cannot access live room",
        account: "Unassigned account",
        steps: [
          "Start a live room as coach.",
          "Copy the live room URL.",
          "Sign in as an account that is not on that team.",
          "Open the live room URL.",
        ],
        expected:
          "The account sees the friendly live room access page or is denied. It should not see plan details or room content.",
      },
      {
        id: "wrong-team-session-review",
        title: "Wrong-team account cannot access session review",
        account: "Unassigned account",
        steps: [
          "Copy a /sessions/[sessionId] review URL.",
          "Sign in as an account that is not on that team.",
          "Open the review URL.",
        ],
        expected:
          "The account is denied or gets not found. It should not see AAR content.",
      },
      {
        id: "wrong-team-dashboard",
        title: "Wrong-team account does not see other team's sessions",
        account: "Unassigned account",
        steps: [
          "Sign in as the unassigned account.",
          "Go to /dashboard.",
          "Go to /sessions.",
        ],
        expected:
          "The account does not see teams, sessions, plans, live rooms, or reviews for teams it does not belong to.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plan Lifecycle Test",
    description:
      "Test archived, duplicated, moved, and used plans so strategy versions behave correctly.",
    items: [
      {
        id: "archive-hides-scheduling",
        title: "Archived plans cannot be scheduled",
        account: "Coach account",
        steps: [
          "Open a plan.",
          "Archive it.",
          "Return to /dashboard.",
          "Open Schedule Session.",
        ],
        expected:
          "The archived plan does not appear in the Active Plan dropdown for scheduling.",
      },
      {
        id: "restore-allows-scheduling",
        title: "Restored plans can be scheduled",
        account: "Coach account",
        steps: [
          "Open an archived plan.",
          "Restore it.",
          "Return to /dashboard.",
          "Open Schedule Session.",
        ],
        expected:
          "The restored plan appears in active plans and can be selected for scheduling.",
      },
      {
        id: "used-plan-not-deletable",
        title: "Used plans cannot be deleted",
        account: "Coach account",
        steps: [
          "Use a plan in a scheduled or live session.",
          "Open that plan.",
          "Click Delete If Unused.",
        ],
        expected:
          "Deletion is blocked. The app instructs you to archive the plan instead.",
      },
      {
        id: "unused-plan-deletable",
        title: "Unused test plans can be deleted",
        account: "Coach account",
        steps: [
          "Create a brand-new test plan.",
          "Do not schedule it.",
          "Open it.",
          "Click Delete If Unused.",
        ],
        expected:
          "The plan is deleted and you return to the dashboard.",
      },
      {
        id: "duplicate-preserves-steps",
        title: "Duplicating a plan preserves canvas and steps",
        account: "Coach account",
        steps: [
          "Open a plan with icons, drawings, payload route, and presentation steps.",
          "Duplicate it.",
          "Open the copy.",
        ],
        expected:
          "The copy has the same canvas data and presentation steps, but is a separate plan.",
      },
    ],
  },
  {
    id: "live-session",
    title: "Live Session Sync Test",
    description:
      "Use coach and player accounts at the same time to confirm realtime behavior.",
    items: [
      {
        id: "live-step-sync",
        title: "Presentation steps sync to player",
        account: "Coach + Player accounts",
        steps: [
          "Start a live room as coach.",
          "Join the room as player in another browser or private window.",
          "Change steps as coach.",
        ],
        expected:
          "Player view changes to the same step without manual refresh.",
      },
      {
        id: "live-message-sync",
        title: "Coach message syncs to player",
        account: "Coach + Player accounts",
        steps: [
          "Join live room as coach and player.",
          "Send a coach message.",
          "Clear the coach message.",
        ],
        expected:
          "Player sees the message appear and disappear.",
      },
      {
        id: "live-payload-sync",
        title: "Payload progress syncs to player",
        account: "Coach + Player accounts",
        steps: [
          "Use a plan with a payload route.",
          "Move the payload progress slider as coach.",
        ],
        expected:
          "Player sees the payload marker update.",
      },
      {
        id: "live-end-session",
        title: "Ending session creates reviewable history",
        account: "Coach account",
        steps: [
          "Run a live session.",
          "End it.",
          "Go to /sessions.",
          "Open the completed session.",
        ],
        expected:
          "The completed session appears in history and can be reviewed.",
      },
    ],
  },
  {
    id: "deployment",
    title: "Deployment Prep Test",
    description:
      "Run this after local security passes and before Vercel deployment.",
    items: [
      {
        id: "env-local-clean",
        title: "Environment variables are correct",
        account: "Developer",
        steps: [
          "Open .env.local.",
          "Confirm NEXT_PUBLIC_SUPABASE_URL is set.",
          "Confirm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set.",
          "Confirm no service role key is exposed in client code.",
        ],
        expected:
          "Only public anon/publishable keys are used in the browser. No secret service role key is committed or exposed.",
      },
      {
        id: "no-console-errors",
        title: "No browser console errors during core flow",
        account: "Developer",
        steps: [
          "Open browser dev tools.",
          "Run through dashboard, planner, live room, and sessions.",
          "Watch for red console errors.",
        ],
        expected:
          "No persistent client-side runtime errors appear.",
      },
      {
        id: "fresh-build",
        title: "Fresh local build succeeds",
        account: "Developer",
        steps: [
          "Stop dev server.",
          "Run rmdir /s /q .next.",
          "Run npm run build.",
        ],
        expected:
          "Production build completes successfully.",
      },
      {
        id: "production-smoke-test",
        title: "Production smoke test after deploy",
        account: "Coach + Player accounts",
        steps: [
          "Deploy to Vercel.",
          "Sign in as coach.",
          "Sign in as player.",
          "Create/schedule/start/end a test session.",
          "Save AAR.",
        ],
        expected:
          "The full coaching loop works in production.",
      },
    ],
  },
];

function getStoredState(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem("overplayed-security-check");
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export default function SecurityCheckClient() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allItems = useMemo(
    () => TEST_GROUPS.flatMap((group) => group.items),
    [],
  );

  const completedCount = allItems.filter((item) => checked[item.id]).length;
  const totalCount = allItems.length;
  const percent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    setChecked(getStoredState());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "overplayed-security-check",
      JSON.stringify(checked),
    );
  }, [checked]);

  function toggleItem(itemId: string) {
    setChecked((previous) => ({
      ...previous,
      [itemId]: !previous[itemId],
    }));
  }

  function resetAll() {
    setChecked({});
    window.localStorage.removeItem("overplayed-security-check");
  }

  function markGroupComplete(group: TestGroup) {
    setChecked((previous) => {
      const next = {
        ...previous,
      };

      for (const item of group.items) {
        next[item.id] = true;
      }

      return next;
    });
  }

  function clearGroup(group: TestGroup) {
    setChecked((previous) => {
      const next = {
        ...previous,
      };

      for (const item of group.items) {
        delete next[item.id];
      }

      return next;
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-cyan-400">Developer Tool</p>
          <h1 className="mt-2 text-3xl font-bold">
            Security & Deployment Check
          </h1>
          <p className="mt-2 text-zinc-400">
            Work through this before deployment. This does not enforce security by itself; it helps verify that your RLS policies, server actions, and role checks are behaving correctly.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-zinc-400">
                {completedCount} of {totalCount} checks complete · {percent}%
              </p>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
            >
              Reset Checklist
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-yellow-900 bg-yellow-950 p-5">
          <h2 className="text-xl font-semibold text-yellow-100">
            Accounts Needed
          </h2>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-yellow-900 bg-zinc-950 p-4">
              <p className="font-semibold">Coach Account</p>
              <p className="mt-1 text-sm text-yellow-200">
                Owns or coaches the test team.
              </p>
            </div>

            <div className="rounded-lg border border-yellow-900 bg-zinc-950 p-4">
              <p className="font-semibold">Player Account</p>
              <p className="mt-1 text-sm text-yellow-200">
                Is only a Player on the test team.
              </p>
            </div>

            <div className="rounded-lg border border-yellow-900 bg-zinc-950 p-4">
              <p className="font-semibold">Unassigned Account</p>
              <p className="mt-1 text-sm text-yellow-200">
                Is not assigned to the test team.
              </p>
            </div>
          </div>
        </section>

        {TEST_GROUPS.map((group) => {
          const groupCompleted = group.items.filter((item) => checked[item.id])
            .length;

          return (
            <section
              key={group.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{group.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {group.description}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {groupCompleted} of {group.items.length} complete
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => markGroupComplete(group)}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                  >
                    Mark Group Complete
                  </button>

                  <button
                    type="button"
                    onClick={() => clearGroup(group)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    Clear Group
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {group.items.map((item) => {
                  const isChecked = Boolean(checked[item.id]);

                  return (
                    <article
                      key={item.id}
                      className={
                        isChecked
                          ? "rounded-lg border border-green-900 bg-green-950 p-4"
                          : "rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                      }
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start">
                        <label className="flex cursor-pointer items-start gap-3 md:w-72">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item.id)}
                            className="mt-1 h-5 w-5 rounded border-zinc-700 bg-zinc-900"
                          />

                          <span>
                            <span className="block font-semibold">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-sm text-zinc-500">
                              {item.account}
                            </span>
                          </span>
                        </label>

                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-300">
                              Steps
                            </p>

                            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
                              {item.steps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                            <p className="text-sm font-semibold text-zinc-300">
                              Expected Result
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {item.expected}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}