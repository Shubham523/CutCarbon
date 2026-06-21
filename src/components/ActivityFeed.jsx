import PropTypes from "prop-types";
import MergedGroup from "./MergedGroup";
import {
  processAndMergeActivities,
  groupActivities,
} from "../utils/activityParser";

/**
 * ActivityFeed component rendering the user's aggregated activity and travel logs.
 *
 * @param {Object} props - The component props.
 * @param {Array} props.activities - All logged activities (fitness, transport, groceries).
 * @param {Function} props.onDelete - Callback triggered to delete an activity entry.
 * @param {Function} props.onEntryUpdate - Callback triggered to update a transit/carpool entry.
 * @param {Object} [props.user] - Authenticated user details.
 */
export default function ActivityFeed({
  activities,
  onDelete,
  onEntryUpdate,
  user,
}) {
  const merged = processAndMergeActivities(
    activities.filter((a) => a.type === "fitness" || a.type === "transport"),
  );

  const groceryLogs = activities.filter(
    (a) => a.type !== "fitness" && a.type !== "transport",
  );

  const groupedData = groupActivities([...merged, ...groceryLogs]);
  const hasContent = activities.length > 0;

  return (
    <section aria-label="Activity feed">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Recent activity
      </p>

      {!hasContent && (
        <p className="text-sm text-gray-400 py-6">
          No activities yet. Use the buttons below to get started.
        </p>
      )}

      {Object.values(groupedData).map((group, idx) => (
        <MergedGroup
          key={group.key ?? idx}
          group={group}
          onDelete={onDelete}
          onEntryUpdate={onEntryUpdate}
          userId={user?.uid}
        />
      ))}
    </section>
  );
}

ActivityFeed.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object).isRequired,
  onDelete: PropTypes.func.isRequired,
  onEntryUpdate: PropTypes.func.isRequired,
  user: PropTypes.object,
};
