import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { getMessages } from "./i18n";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('fileTreeExporter');
  const currentLanguage = config.get('language');

  // 現在の設定が空文字列（自動）の場合のみ、VS Code言語に基づいて設定
  if (currentLanguage === "") {
    const vscodeLanguage = vscode.env.language;
    if (vscodeLanguage === 'ja') {
      config.update('language', 'ja', vscode.ConfigurationTarget.Global);
    } else {
      config.update('language', 'en', vscode.ConfigurationTarget.Global);
    }
  }

  // 階層構造を保ってコピーするコマンド
  const exportFileTreeCommand = vscode.commands.registerCommand(
    "file-tree-exporter.exportFileTree",
    async (firstArg, ...otherArgs) => {
      // 現在の言語設定に基づくメッセージを取得
      const messages = getMessages();

      try {
        // 処理済みURIを追跡するためのSet（重複を避ける）
        const processedUris = new Set<string>();

        // リソースの配列を取得
        let resources: vscode.Uri[] = [];

        // 最初の引数がUriの場合
        if (firstArg instanceof vscode.Uri) {
          resources.push(firstArg);
          processedUris.add(firstArg.toString());
        }

        // 2番目の引数が配列の場合、その中のUriを追加（重複を避ける）
        if (Array.isArray(otherArgs[0])) {
          for (const item of otherArgs[0]) {
            if (item instanceof vscode.Uri) {
              // 既に処理済みでなければ追加
              if (!processedUris.has(item.toString())) {
                resources.push(item);
                processedUris.add(item.toString());
              }
            }
          }
        }

        // 少なくとも1つのリソースが見つかった場合
        if (resources.length > 0) {
          // コピー先フォルダを一度だけ選択
          const targetFolderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: messages.selectTargetFolder,
            title: messages.selectTargetFolderTitle,
          });

          if (!targetFolderUri || targetFolderUri.length === 0) {
            return; // ユーザーがキャンセルした場合
          }

          const targetBasePath = targetFolderUri[0].fsPath;

          // 処理開始メッセージ
          // vscode.window.showInformationMessage(
          //   messages.startCopyMessage(resources.length)
          // );

          // プログレス表示
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: messages.copyingFilesTitle,
              cancellable: false,
            },
            async (progress) => {
              try {
                let totalFilesCopied = 0;
                const total = resources.length;

                // 各リソースに対して処理を実行
                for (let i = 0; i < resources.length; i++) {
                  const resource = resources[i];

                  // ワークスペースフォルダを特定
                  const workspaceFolder =
                    vscode.workspace.getWorkspaceFolder(resource);
                  if (!workspaceFolder) {
                    vscode.window.showWarningMessage(
                      messages.skipWorkspaceFile(resource.fsPath)
                    );
                    continue;
                  }

                  // プロジェクトルートからの相対パスを計算
                  const relativePath = path.relative(
                    workspaceFolder.uri.fsPath,
                    resource.fsPath
                  );
                  const projectName = path.basename(workspaceFolder.uri.fsPath);

                  // プロジェクトフォルダ名を含めたコピー先パスを作成
                  const targetProjectPath = path.join(
                    targetBasePath,
                    projectName
                  );

                  // ファイルをコピー
                  const filesCopied = await copyProjectStructure(
                    resource.fsPath,
                    workspaceFolder.uri.fsPath,
                    targetProjectPath,
                    messages
                  );
                  totalFilesCopied += filesCopied;

                  // 進捗を更新
                  progress.report({
                    message: `${i + 1}/${total} - ${path.basename(
                      resource.fsPath
                    )}`,
                    increment: 100 / total,
                  });
                }

                vscode.window.showInformationMessage(
                  messages.completedCopy(totalFilesCopied, targetBasePath)
                );
              } catch (error) {
                vscode.window.showErrorMessage(messages.copyError(error));
              }
            }
          );

          return;
        }

        // リソースが見つからなかった場合
        vscode.window.showInformationMessage(messages.noResourcesFound);
      } catch (error) {
        const messages = getMessages(); // エラーキャッチの場合も改めて取得
        vscode.window.showErrorMessage(messages.copyError(error));
      }
    }
  );

  // コマンドを登録
  context.subscriptions.push(exportFileTreeCommand);
}

// ファイル構造を保持してコピーする
async function copyProjectStructure(
  sourcePath: string,
  sourceBasePath: string,
  targetProjectPath: string,
  messages: any
): Promise<number> {
  // コピーしたファイル数をカウント
  let filesCopied = 0;

  try {
    const stats = fs.statSync(sourcePath);

    // ソースパスからの相対パスを計算
    const relativePath = path.relative(sourceBasePath, sourcePath);

    // 相対パスをターゲットベースに適用して保存先を決定
    const targetPath = path.join(targetProjectPath, relativePath);

    if (stats.isDirectory()) {
      // ディレクトリの場合、ディレクトリを作成して中身を再帰的にコピー
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const files = fs.readdirSync(sourcePath);
      for (const file of files) {
        // 隠しファイルやnode_modulesなどを除外（必要に応じてカスタマイズ）
        if (file.startsWith(".") || file === "node_modules") {
          continue;
        }

        const filePath = path.join(sourcePath, file);
        filesCopied += await copyProjectStructure(
          filePath,
          sourceBasePath,
          targetProjectPath,
          messages
        );
      }
    } else {
      // ファイルの場合、ディレクトリ構造を作成してからファイルをコピー
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, targetPath);
      filesCopied++;
    }
  } catch (error) {
    throw new Error(messages.fileOpeartionError(sourcePath, error));
  }

  return filesCopied;
}

export function deactivate() {}
