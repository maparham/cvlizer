/**
 * CVs Section Skeleton
 *
 * Empty-state loading UI for the dashboard CVs section while data is loading.
 */
import React from "react";
import SectionSkeleton from "./SectionSkeleton";

const CVsSectionSkeleton: React.FC = () => {
  return (
    <SectionSkeleton
      title="My CVs"
      loadingMessage="Loading your CVs..."
      subtitle="Please wait while we fetch your dashboard data."
      minHeight={240}
    />
  );
};

export default CVsSectionSkeleton;
