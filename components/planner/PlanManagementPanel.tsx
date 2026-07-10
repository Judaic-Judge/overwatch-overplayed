type TeamOption = {
  id: string;
  name: string;
};

type PlanManagementPanelProps = {
  planId: string;
  title: string;
  currentTeamId: string | null;
  archivedAt: string | null;
  coachTeams: TeamOption[];
  renamePlanAction: (formData: FormData) => void | Promise<void>;
  duplicatePlanAction: (formData: FormData) => void | Promise<void>;
  archivePlanAction: (formData: FormData) => void | Promise<void>;
  restorePlanAction: (formData: FormData) => void | Promise<void>;
  deletePlanAction: (formData: FormData) => void | Promise<void>;
  movePlanAction: (formData: FormData) => void | Promise<void>;
};

export default function PlanManagementPanel({
  planId,
  title,
  currentTeamId,
  archivedAt,
  coachTeams,
  renamePlanAction,
  duplicatePlanAction,
  archivePlanAction,
  restorePlanAction,
  deletePlanAction,
  movePlanAction,
}: PlanManagementPanelProps) {
  const isArchived = Boolean(archivedAt);

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-cyan-400">Plan Management</p>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Rename, duplicate, archive, delete, or assign this plan to one of your coaching teams.
          </p>
        </div>

        {isArchived ? (
          <div className="rounded-lg border border-yellow-900 bg-yellow-950 px-3 py-2 text-sm text-yellow-200">
            Archived{" "}
            {archivedAt ? new Date(archivedAt).toLocaleString() : ""}
          </div>
        ) : (
          <div className="rounded-lg border border-green-900 bg-green-950 px-3 py-2 text-sm text-green-200">
            Active Plan
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-semibold">Rename Plan</h3>

          <form action={renamePlanAction} className="mt-3 space-y-3">
            <input type="hidden" name="planId" value={planId} />

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="planTitle">
                Plan Title
              </label>

              <input
                id="planTitle"
                name="planTitle"
                required
                minLength={2}
                maxLength={120}
                defaultValue={title}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Rename Plan
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-semibold">Assign / Move Plan</h3>

          <form action={movePlanAction} className="mt-3 space-y-3">
            <input type="hidden" name="planId" value={planId} />

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="teamId">
                Plan Location
              </label>

              <select
                id="teamId"
                name="teamId"
                defaultValue={currentTeamId || "__personal"}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
              >
                <option value="__personal">Personal Draft</option>

                {coachTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-zinc-500">
                You can only assign plans to teams where you are Coach or Assistant Coach.
              </p>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Move Plan
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-semibold">Duplicate Plan</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Creates a copy of this plan, including canvas, steps, icons, drawings, and payload data.
          </p>

          <form action={duplicatePlanAction} className="mt-3">
            <input type="hidden" name="planId" value={planId} />

            <button
              type="submit"
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-green-400"
            >
              Duplicate Plan
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-semibold">
            {isArchived ? "Restore Plan" : "Archive Plan"}
          </h3>

          {isArchived ? (
            <>
              <p className="mt-2 text-sm text-zinc-400">
                Restores this plan so it can be used as an active strategy again.
              </p>

              <form action={restorePlanAction} className="mt-3">
                <input type="hidden" name="planId" value={planId} />

                <button
                  type="submit"
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-yellow-400"
                >
                  Restore Plan
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-zinc-400">
                Archives this plan without deleting it. Use this for old versions or retired strategies.
              </p>

              <form action={archivePlanAction} className="mt-3">
                <input type="hidden" name="planId" value={planId} />

                <button
                  type="submit"
                  className="rounded-lg border border-yellow-800 bg-yellow-950 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-900"
                >
                  Archive Plan
                </button>
              </form>
            </>
          )}
        </div>

        <div className="rounded-xl border border-red-900 bg-red-950 p-4">
          <h3 className="font-semibold text-red-100">Delete Plan</h3>

          <p className="mt-2 text-sm text-red-200">
            Permanent delete only works if this plan has not been used in a scheduled or live session.
          </p>

          <form action={deletePlanAction} className="mt-3">
            <input type="hidden" name="planId" value={planId} />

            <button
              type="submit"
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-red-400"
            >
              Delete If Unused
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}