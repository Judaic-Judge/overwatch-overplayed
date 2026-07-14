import Link from "next/link";

type HelpSection = {
  id: string;
  title: string;
  description: string;
};

const sections: HelpSection[] = [
  {
    id: "quick-start",
    title: "Quick Start",
    description: "The shortest path from new account to live coaching session.",
  },
  {
    id: "coach-guide",
    title: "Coach Guide",
    description: "How to create teams, plans, sessions, and live rooms.",
  },
  {
    id: "player-guide",
    title: "Player Guide",
    description: "How players join teams, live rooms, and session reviews.",
  },
  {
    id: "planner-guide",
    title: "Planner / Canvas Guide",
    description: "How to use the pop-out editor, icons, drawings, and steps.",
  },
  {
    id: "live-room-guide",
    title: "Live Room Guide",
    description: "How live presentation works during coaching.",
  },
  {
    id: "aar-guide",
    title: "Session Review / AAR Guide",
    description: "How to review completed sessions and write notes.",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Common questions and confusing parts.",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "What to check when something does not behave correctly.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-cyan-400">Help / FAQ</p>
          <h1 className="text-3xl font-bold">How to Use Overwatch Overplayed</h1>
          <p className="max-w-3xl text-zinc-400">
            This page explains the full workflow: creating teams, building plans,
            running live coaching sessions, and reviewing completed sessions.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-cyan-800 hover:bg-zinc-800"
            >
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {section.description}
              </p>
            </a>
          ))}
        </section>

        <section
          id="quick-start"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-cyan-400">Quick Start</p>
          <h2 className="mt-1 text-2xl font-bold">Basic App Flow</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold">Coach Flow</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
                <li>Create a team.</li>
                <li>Create or duplicate a plan.</li>
                <li>Open the plan and build the canvas.</li>
                <li>Create presentation steps from the canvas.</li>
                <li>Invite players to the team.</li>
                <li>Schedule a session.</li>
                <li>Start the live room.</li>
                <li>Control the presentation while players watch.</li>
                <li>End the session.</li>
                <li>Write the AAR/session review.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold">Player Flow</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
                <li>Sign in or create an account.</li>
                <li>Use the invite link from the coach.</li>
                <li>Join the team as a player.</li>
                <li>Wait for the coach to start a live room.</li>
                <li>Join the live room from the dashboard or sessions page.</li>
                <li>Watch the coach-controlled presentation.</li>
                <li>After the session, open the review from Sessions.</li>
              </ol>
            </div>
          </div>
        </section>

        <section
          id="coach-guide"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-cyan-400">Coach Guide</p>
          <h2 className="mt-1 text-2xl font-bold">Using the App as a Coach</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">1. Create a Team</h3>
              <p className="mt-2">
                Go to the Dashboard and use <strong>Create a New Team</strong>.
                Creating a team makes you the coach/owner of that team.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">2. Invite Players</h3>
              <p className="mt-2">
                In the Coach Workspace, use <strong>Player Invite Links</strong>.
                Send the invite link to your players. When they accept it, they
                are added as players on that team.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">3. Create a Plan</h3>
              <p className="mt-2">
                Use <strong>Create Plan</strong> to choose a map and mode. Once
                created, open it from <strong>Active Coach Plans</strong>.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">4. Schedule a Session</h3>
              <p className="mt-2">
                Use <strong>Schedule Session</strong>, select the team, select
                an active plan, and choose a date/time. Archived plans cannot be
                scheduled.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">5. Start a Live Room</h3>
              <p className="mt-2">
                In Coach Sessions, click <strong>Start Live Room</strong>. The
                coach controls which step is active, payload progress, and coach
                messages.
              </p>
            </div>
          </div>
        </section>

        <section
          id="player-guide"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-green-400">Player Guide</p>
          <h2 className="mt-1 text-2xl font-bold">Using the App as a Player</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Join a Team</h3>
              <p className="mt-2">
                Your coach should send you an invite link. Open it, sign in, and
                accept the invite. You will appear on that team as a player.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Join a Live Room</h3>
              <p className="mt-2">
                When the coach starts a live session, the room appears on your
                Dashboard and Sessions page. Click <strong>Join Live Room</strong>.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Player View is Read-Only</h3>
              <p className="mt-2">
                Players do not control the presentation. The coach changes
                steps, sends messages, and controls the live session.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">View Session Reviews</h3>
              <p className="mt-2">
                After a session ends, go to <strong>Sessions & Reviews</strong>.
                Players can see the public summary, what went well, needs
                improvement, next goals, and replay links. Private coach notes
                are not visible to players.
              </p>
            </div>
          </div>
        </section>

        <section
          id="planner-guide"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-cyan-400">Planner / Canvas Guide</p>
          <h2 className="mt-1 text-2xl font-bold">Building a Tactical Plan</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Open the Pop-Out Editor</h3>
              <p className="mt-2">
                The main planner page shows a preview. Click{" "}
                <strong>Open Pop-Out Editor</strong> to edit the actual canvas.
                This gives you more screen space and prevents the planner page
                from getting cluttered.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Canvas Draft vs Presentation Steps</h3>
              <p className="mt-2">
                The pop-out editor changes the current canvas draft. Presentation
                steps are snapshots of the canvas. If you want Step 1, Step 2,
                and Step 3 to look different, you need to capture each step
                separately.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Creating Steps</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>Set up the canvas in the pop-out editor.</li>
                <li>Return to the planner page.</li>
                <li>Click <strong>Add Step From Current Canvas</strong>.</li>
                <li>Change the canvas for the next moment.</li>
                <li>Select the next step and click <strong>Capture Current Canvas</strong>.</li>
                <li>Click <strong>Save Steps</strong>.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Important Save Rule</h3>
              <p className="mt-2">
                After creating or editing presentation steps, click{" "}
                <strong>Save Steps</strong>. The live room uses saved step
                snapshots, not unsaved planner changes.
              </p>
            </div>
          </div>
        </section>

        <section
          id="live-room-guide"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-green-400">Live Room Guide</p>
          <h2 className="mt-1 text-2xl font-bold">Running a Live Session</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Coach Controls</h3>
              <p className="mt-2">
                Coaches can move between steps, adjust payload progress, and
                send a coach message. Players see the changes live.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Player View</h3>
              <p className="mt-2">
                Players can pan and zoom their viewer, but they cannot change
                the current step or control the presentation.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Ending the Session</h3>
              <p className="mt-2">
                When the coach ends the session, it becomes a completed session
                and appears under <strong>Sessions & Reviews</strong>.
              </p>
            </div>
          </div>
        </section>

        <section
          id="aar-guide"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-cyan-400">Session Review / AAR Guide</p>
          <h2 className="mt-1 text-2xl font-bold">Reviewing Completed Sessions</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Where to Find Reviews</h3>
              <p className="mt-2">
                Go to <strong>Sessions & Reviews</strong>, then open a completed
                session.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">Coach AAR Fields</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Public Summary</li>
                <li>What Went Well</li>
                <li>Needs Improvement</li>
                <li>Next Session Goals</li>
                <li>Replay / VOD Link</li>
                <li>Private Coach Notes</li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">What Players Can See</h3>
              <p className="mt-2">
                Players can see public AAR sections and replay links. They
                cannot see private coach notes.
              </p>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-cyan-400">FAQ</p>
          <h2 className="mt-1 text-2xl font-bold">Frequently Asked Questions</h2>

          <div className="mt-4 space-y-4">
            <FaqItem
              question="Why can I be a player and a coach at the same time?"
              answer="Roles are team-specific. You can be a coach on one team and a player on another team. Creating a new team makes you the coach/owner of that new team only."
            />

            <FaqItem
              question="Why do I have to capture each presentation step?"
              answer="The canvas editor changes the current draft. Presentation steps are saved snapshots of that draft. Capturing each step lets every step have its own icons, drawings, and payload state."
            />

            <FaqItem
              question="Why does a player see a 404 or access page for a live room?"
              answer="That usually means the account is not assigned to the team presenting that room, the room code is wrong, or the session has ended."
            />

            <FaqItem
              question="Can archived plans be scheduled?"
              answer="No. Archived plans are retired or inactive. Restore or duplicate the plan before scheduling it."
            />

            <FaqItem
              question="Why can’t I delete some plans?"
              answer="Plans that have already been used in scheduled or live sessions are protected. Archive them instead of deleting them."
            />

            <FaqItem
              question="Can players edit AAR notes?"
              answer="No. Players can read public AAR sections, but only coaches and assistant coaches can edit AAR notes."
            />

            <FaqItem
              question="Can players see private coach notes?"
              answer="No. Private coach notes are only shown to coaches and assistant coaches."
            />

            <FaqItem
              question="Why does the planner use a pop-out editor?"
              answer="The pop-out editor gives more room for map work and keeps the main planner page focused on previewing, managing steps, and saving the presentation."
            />
          </div>
        </section>

        <section
          id="troubleshooting"
          className="scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <p className="text-sm text-red-400">Troubleshooting</p>
          <h2 className="mt-1 text-2xl font-bold">Common Problems</h2>

          <div className="mt-4 space-y-4 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">
                I cannot see a live room
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Make sure you are signed into the correct account.</li>
                <li>Make sure you accepted the invite for that team.</li>
                <li>Make sure the coach has started the live room.</li>
                <li>Ask the coach to confirm you are on the correct team.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">
                My steps all look the same
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Open the pop-out editor.</li>
                <li>Set the canvas for Step 1.</li>
                <li>Capture Step 1.</li>
                <li>Change the canvas for Step 2.</li>
                <li>Capture Step 2.</li>
                <li>Click Save Steps.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">
                Players cannot join my session
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Confirm the player is on the same team as the session.</li>
                <li>Confirm the session is live.</li>
                <li>Confirm the player is using the correct account.</li>
                <li>Confirm the room link is copied correctly.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="font-semibold text-zinc-100">
                I changed something but do not see it live
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Make sure the plan or steps were saved.</li>
                <li>Refresh the live room if the session was already open.</li>
                <li>For presentation steps, make sure each step has a captured snapshot.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-cyan-900 bg-cyan-950 p-5">
          <h2 className="text-xl font-semibold text-cyan-100">
            Still Need Help?
          </h2>
          <p className="mt-2 text-cyan-200">
            Return to the dashboard, check your role on the team, and confirm
            whether you are acting as a coach or player for that specific team.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/sessions"
              className="rounded-lg border border-cyan-700 px-4 py-2 font-semibold text-cyan-100 hover:bg-cyan-900"
            >
              Go to Sessions
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="font-semibold text-zinc-100">{question}</h3>
      <p className="mt-2 text-sm text-zinc-400">{answer}</p>
    </div>
  );
}