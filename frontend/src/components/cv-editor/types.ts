/**
 * TypeScript interfaces for CV Editor components
 */

export interface CVEditorHeaderProps {
  onLogout: () => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  anchorEl: null | HTMLElement;
  onExport: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  isNewCV: boolean;
}

export interface CVEditorContentProps {
  cvId: string | undefined;
  activeCV: any;
  onLogout: () => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  anchorEl: null | HTMLElement;
  onTitleSave: (title: string) => Promise<void>;
  onDelete: () => void;
  isAdmin: boolean;
  isNewCV: boolean;
}

export interface CVEditorDialogsProps {
  deleteDialogOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  activeCV: any;
}
