export const messages = {
  startCopyMessage: (count: number) =>
    `Starting to copy ${count} selected files/folders`,
  copyingFilesTitle: "Copying files...",
  skipWorkspaceFile: (path: string) =>
    `Skipping file outside of workspace: ${path}`,
  completedCopy: (count: number, path: string) =>
    `Copied ${count} files to ${path}`,
  noResourcesFound:
    "Please select files in Explorer and run this command from the context menu",
  copyError: (error: any) => `An error occurred during copy: ${error}`,
  fileOpeartionError: (path: string, error: any) =>
    `Error copying file: ${path} -> ${error}`,
  selectTargetFolder: "Select destination folder",
  selectTargetFolderTitle:
    "Select the folder where files will be copied with their directory structure",
};
