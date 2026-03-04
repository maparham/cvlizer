/**
 * CVs Table Component
 *
 * Displays the CV list in a sortable table view. Columns: Title, Status, File type,
 * Created, Modified, Sections, Actions. Last row is an "Add CV" drop zone.
 */
import React, { useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import {
  Edit as EditIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import {
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as ProcessingIcon,
} from "@mui/icons-material";
import { EditableTitle } from "../cv";
import { CV } from "../../types";
import { getSectionCount, isUploadedCV } from "../../utils/dashboardUtils";
import { formatDateTime } from "../../utils/dateFormat";
import { validateCVFile } from "../../utils/fileValidation";

export type CVTableSortColumn =
  | "original_filename"
  | "status"
  | "file_type"
  | "created_at"
  | "updated_at"
  | "sections";

function getStatusOrder(cv: CV): number {
  if (cv.parse_error) return 0;
  if (cv.is_parsed) return 2;
  return 1;
}

function getStatusLabel(cv: CV): string {
  if (cv.parse_error) return "Error";
  if (cv.is_parsed) return "Ready";
  return "Processing";
}

function getStatusIcon(cv: CV) {
  if (cv.parse_error) return <ErrorIcon color="error" fontSize="small" />;
  if (cv.is_parsed) return <CheckCircleIcon color="success" fontSize="small" />;
  return <ProcessingIcon color="warning" fontSize="small" />;
}

function compareCVs(
  a: CV,
  b: CV,
  sortBy: CVTableSortColumn,
  direction: "asc" | "desc"
): number {
  const mult = direction === "asc" ? 1 : -1;
  let cmp = 0;
  switch (sortBy) {
    case "original_filename":
      cmp = (a.original_filename || "").localeCompare(b.original_filename || "");
      break;
    case "status":
      cmp = getStatusOrder(a) - getStatusOrder(b);
      break;
    case "file_type":
      cmp = (a.file_type || "").localeCompare(b.file_type || "");
      break;
    case "created_at":
      cmp =
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime();
      break;
    case "updated_at":
      cmp =
        new Date(a.updated_at || 0).getTime() -
        new Date(b.updated_at || 0).getTime();
      break;
    case "sections":
      cmp = getSectionCount(a) - getSectionCount(b);
      break;
    default:
      return 0;
  }
  return mult * cmp;
}

interface SortableHeaderProps {
  column: CVTableSortColumn;
  label: string;
  sortBy: CVTableSortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: CVTableSortColumn) => void;
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

interface CVsTableProps {
  cvs: CV[];
  sortBy: CVTableSortColumn;
  sortDirection: "asc" | "desc";
  onSortChange: (sortBy: CVTableSortColumn, sortDirection: "asc" | "desc") => void;
  onEdit: (cvId: string) => void;
  onDelete: (cv: CV) => void;
  onDuplicate: (cv: CV) => void;
  onTitleSave: (cv: CV, newTitle: string) => Promise<void>;
  onDownload: (cv: CV) => void;
  onFileSelected: (file: File) => void;
  onValidationError?: (error: string) => void;
}

const CVsTable: React.FC<CVsTableProps> = ({
  cvs,
  sortBy,
  sortDirection,
  onSortChange,
  onEdit,
  onDelete,
  onDuplicate,
  onTitleSave,
  onDownload,
  onFileSelected,
  onValidationError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedCVs = useMemo(() => {
    const list = [...cvs];
    list.sort((a, b) => compareCVs(a, b, sortBy, sortDirection));
    return list;
  }, [cvs, sortBy, sortDirection]);

  const handleSort = (column: CVTableSortColumn) => {
    const nextDirection =
      sortBy === column && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(column, nextDirection);
  };

  const sortableHeaderProps = { sortBy, sortDirection, onSort: handleSort };
  const handleAddCvClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validation = validateCVFile(file);
      if (validation.isValid) {
        onFileSelected(file);
      } else if (validation.error && onValidationError) {
        onValidationError(validation.error);
      }
    }
    e.target.value = "";
  };

  const handleAddRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateCVFile(file);
      if (validation.isValid) {
        onFileSelected(file);
      } else if (validation.error && onValidationError) {
        onValidationError(validation.error);
      }
    }
  };

  return (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <SortableHeader column="original_filename" label="Title" {...sortableHeaderProps} />
            <SortableHeader column="status" label="Status" {...sortableHeaderProps} />
            <SortableHeader column="file_type" label="File type" {...sortableHeaderProps} />
            <SortableHeader column="created_at" label="Created" {...sortableHeaderProps} />
            <SortableHeader column="updated_at" label="Modified" {...sortableHeaderProps} />
            <SortableHeader column="sections" label="Sections" {...sortableHeaderProps} />
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedCVs.map((cv) => (
            <TableRow key={cv.id} hover>
              <TableCell>
                <EditableTitle
                  title={cv.original_filename}
                  onSave={(newTitle) => onTitleSave(cv, newTitle)}
                  variant="h6"
                  sx={{ fontSize: "0.875rem", fontWeight: 600 }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title={getStatusLabel(cv)}>
                  <Box component="span" sx={{ display: "inline-flex" }}>
                    {getStatusIcon(cv)}
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell>
                {isUploadedCV(cv) ? (
                  <Typography variant="body2" color="text.secondary">
                    {cv.file_type?.split("/")[1]?.toUpperCase() ?? cv.file_type}
                  </Typography>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(cv.created_at)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {cv.updated_at && cv.updated_at !== cv.created_at
                    ? formatDateTime(cv.updated_at)
                    : "—"}
                </Typography>
              </TableCell>
              <TableCell>
                {cv.is_parsed ? (
                  <Typography variant="body2" color="text.secondary">
                    {getSectionCount(cv)}
                  </Typography>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title={!cv.is_parsed && !cv.parse_error ? "Processing..." : "Edit"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(cv.id)}
                      disabled={!cv.is_parsed || !!cv.parse_error}
                      data-testid={`edit-cv-button-${cv.id}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onDuplicate(cv)}
                      disabled={!cv.is_parsed || !!cv.parse_error}
                    >
                      <DuplicateIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                {isUploadedCV(cv) && !cv.parse_error && (
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={() => onDownload(cv)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(cv)}
                    data-testid={`delete-cv-button-${cv.id}`}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {/* Add CV row */}
          <TableRow
            sx={{
              backgroundColor: "action.hover",
              "&:hover": { backgroundColor: "action.selected" },
              cursor: "pointer",
            }}
            onClick={handleAddCvClick}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleAddRowDrop}
            data-testid="cv-table-add-row"
          >
            <TableCell colSpan={7} align="center" sx={{ py: 2 }}>
              <UploadIcon sx={{ fontSize: 28, color: "text.secondary", mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                Add CV — click or drag & drop (PDF, DOCX, max 10MB)
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInput}
        style={{ display: "none" }}
        data-testid="cv-table-file-input"
      />
    </TableContainer>
  );
};

export default CVsTable;
