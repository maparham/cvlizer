/**
 * Job Applications Section Skeleton
 *
 * Empty-state loading UI for the dashboard job applications section while data is loading.
 */
import React from "react";
import SectionSkeleton from "./SectionSkeleton";

const JobApplicationsSectionSkeleton: React.FC = () => {
  return (
    <SectionSkeleton
      title="Job Applications"
      loadingMessage="Loading job applications..."
      subtitle="Fetching your latest job cards."
      minHeight={200}
    />
  );
};

export default JobApplicationsSectionSkeleton;
