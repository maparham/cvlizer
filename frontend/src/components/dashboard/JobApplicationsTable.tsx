/**
 * Job Applications Table Component
 *
 * Displays job applications in a sortable table view. Columns: Title, Company,
 * Location, Status, Created, Application Date, Actions.
 * Status is rendered as a colored Chip matching the scheme in JobDescriptionCard.
 *
 * Usage:
 * - Rendered by JobApplicationsCard when viewMode === "list"
 * - Receives handlers for Edit and Update Status from the Dashboard
 */
import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import ShareIcon from "@mui/icons-material/Share";
import StatusIcon from "@mui/icons-material/SwapHoriz";
import { JobDescription } from "../../types/ai";
import { formatDateTime } from "../../utils/dateFormat";
import { ShareDialog } from "../sharing/ShareDialog";

export type JobTableSortColumn =
  | "title"
  | "company"
  | "location"
  | "status"
  | "created_at"
  | "application_date";

function getStatusSx(status: string | undefined) {
  switch (status) {
    case "open":
      return {
        backgroundColor: "rgba(33, 150, 243, 0.1)",
        color: "#1976d2",
        fontWeight: 600,
      };
    case "applied":
      return {
        backgroundColor: "rgba(255, 152, 0, 0.1)",
        color: "#ed6c02",
        fontWeight: 600,
      };
    default:
      return {
        backgroundColor: "rgba(158, 158, 158, 0.1)",
        color: "#757575",
        fontWeight: 600,
      };
  }
}

function compareJDs(
  a: JobDescription,
  b: JobDescription,
  sortBy: JobTableSortColumn,
  direction: "asc" | "desc"
): number {
  const mult = direction === "asc" ? 1 : -1;
  let cmp = 0;
  switch (sortBy) {
    case "title":
      cmp = (a.title || "").localeCompare(b.title || "");
      break;
    case "company":
      cmp = (a.company || "").localeCompare(b.company || "");
      break;
    case "location":
      cmp = (a.location || "").localeCompare(b.location || "");
      break;
    case "status": {
      const order = { open: 0, applied: 1, archived: 2 };
      const aOrder = order[(a.status as keyof typeof order) ?? "open"] ?? 0;
      const bOrder = order[(b.status as keyof typeof order) ?? "open"] ?? 0;
      cmp = aOrder - bOrder;
      break;
    }
    case "created_at":
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;
    case "application_date":
      cmp =
        new Date(a.application_date || 0).getTime() -
        new Date(b.application_date || 0).getTime();
      break;
    default:
      return 0;
  }
  return mult * cmp;
}

interface SortableHeaderProps {
  column: JobTableSortColumn;
  label: string;
  sortBy: JobTableSortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: JobTableSortColumn) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  label,
  sortBy,
  sortDirection,
  onSort,
}) => (
  <TableCell sortDirection={sortBy === column ? sortDirection : false}>
    <TableSortLabel
      active={sortBy === column}
      direction={sortBy === column ? sortDirection : "asc"}
      onClick={() => onSort(column)}
    >
      {label}
    </TableSortLabel>
  </TableCell>
);

interface JobApplicationsTableProps {
  jobDescriptions: JobDescription[];
  sortBy: JobTableSortColumn;
  sortDirection: "asc" | "desc";
  onSortChange: (sortBy: JobTableSortColumn, sortDirection: "asc" | "desc") => void;
  onEditJobDescription: (jd: JobDescription) => void;
  onUpdateStatus: (jd: JobDescription) => void;
  onSharingMutation?: () => void;
}

const JobApplicationsTable: React.FC<JobApplicationsTableProps> = ({
  jobDescriptions,
  sortBy,
  sortDirection,
  onSortChange,
  onEditJobDescription,
  onUpdateStatus,
  onSharingMutation,
}) => {
  const [shareJdId, setShareJdId] = useState<string | null>(null);
  const sortedJDs = useMemo(() => {
    const list = [...jobDescriptions];
    list.sort((a, b) => compareJDs(a, b, sortBy, sortDirection));
    return list;
  }, [jobDescriptions, sortBy, sortDirection]);

  const handleSort = (column: JobTableSortColumn) => {
    const nextDirection =
      sortBy === column && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(column, nextDirection);
  };

  const sortableHeaderProps = { sortBy, sortDirection, onSort: handleSort };

  return (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <SortableHeader column="title" label="Title" {...sortableHeaderProps} />
            <SortableHeader column="company" label="Company" {...sortableHeaderProps} />
            <SortableHeader column="location" label="Location" {...sortableHeaderProps} />
            <SortableHeader column="status" label="Status" {...sortableHeaderProps} />
            <SortableHeader column="created_at" label="Created" {...sortableHeaderProps} />
            <SortableHeader column="application_date" label="Applied" {...sortableHeaderProps} />
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedJDs.map((jd) => (
            <TableRow key={jd.id} hover>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {jd.title || "—"}
                  </Typography>
                  {jd.is_public_shared && (
                    <Tooltip title="Click to manage public sharing">
                      <Chip
                        icon={<ShareIcon />}
                        label="Shared"
                        size="small"
                        color="info"
                        variant="outlined"
                        clickable
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareJdId(jd.id);
                        }}
                        sx={{ cursor: "pointer" }}
                      />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {jd.company || "—"}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {jd.location || "—"}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    jd.status
                      ? jd.status.charAt(0).toUpperCase() + jd.status.slice(1)
                      : "Open"
                  }
                  size="small"
                  sx={getStatusSx(jd.status)}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(jd.created_at)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {jd.application_date ? formatDateTime(jd.application_date) : "—"}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEditJobDescription(jd)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Update status">
                  <IconButton size="small" onClick={() => onUpdateStatus(jd)}>
                    <StatusIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {shareJdId && (
        <ShareDialog
          open
          onClose={() => setShareJdId(null)}
          resourceType="job_description"
          resourceId={shareJdId}
          onSharingMutation={onSharingMutation}
        />
      )}
    </TableContainer>
  );
};

export default JobApplicationsTable;
