/**
 * Archive Tab Component
 *
 * Displays job descriptions in a grid layout with edit, delete, and select functionality.
 */

import React from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";
import JobDescriptionCard from "../JobDescriptionCard";
import { ArchiveTabProps } from "./types";

const ArchiveTab: React.FC<ArchiveTabProps> = ({
  jobDescriptions,
  activeJobDescription,
  parsingJobDescriptions,
  onEdit,
  onDelete,
  onSelect,
}) => {
  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 2 }}>
      {jobDescriptions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" variant="h6" gutterBottom>
            No job descriptions saved yet
          </Typography>
          <Typography color="text.secondary">
            Add one using the URL or MANUAL tabs.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {jobDescriptions.map((jobDescription) => {
            const isParsing =
              jobDescription.is_parsing ||
              parsingJobDescriptions.has(jobDescription.id);

            return (
              <Grid
                item
                xs={12}
                md={6}
                lg={4}
                key={jobDescription.id}
              >
                <JobDescriptionCard
                  jobDescription={jobDescription}
                  isActive={
                    activeJobDescription?.id === jobDescription.id
                  }
                  isParsing={isParsing}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSelect={onSelect}
                  showSelectButton={true}
                  maxChipWidth={200}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default ArchiveTab;
