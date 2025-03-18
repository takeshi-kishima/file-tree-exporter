export const messages = {
  startCopyMessage: (count: number) =>
    `選択した ${count} 個のファイル・フォルダのコピーを開始します`,
  copyingFilesTitle: "ファイルをコピーしています...",
  skipWorkspaceFile: (path: string) =>
    `ワークスペース外のファイルはスキップします: ${path}`,
  completedCopy: (count: number, path: string) =>
    `${count}個のファイルを ${path} にコピーしました`,
  noResourcesFound:
    "エクスプローラーでファイルを選択して右クリックからコマンドを実行してください",
  copyError: (error: any) => `コピー中にエラーが発生しました: ${error}`,
  fileOpeartionError: (path: string, error: any) =>
    `ファイルコピー中にエラーが発生しました: ${path} -> ${error}`,
  selectTargetFolder: "コピー先フォルダを選択",
  selectTargetFolderTitle:
    "ファイルの階層構造を保持してコピーする先のフォルダを選択",
};
