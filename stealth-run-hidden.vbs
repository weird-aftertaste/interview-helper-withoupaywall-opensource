Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
logPath = scriptDir & "\stealth-run-hidden.log"
mainJsPath = scriptDir & "\dist-electron\main.js"

shell.CurrentDirectory = scriptDir

If fso.FileExists(mainJsPath) Then
  cmd = "cmd.exe /c ""cd /d " & scriptDir & " && set NODE_ENV=production && npx electron ./dist-electron/main.js > " & logPath & " 2>&1"""
Else
  cmd = "cmd.exe /c ""cd /d " & scriptDir & " && npm run build && set NODE_ENV=production && npx electron ./dist-electron/main.js > " & logPath & " 2>&1"""
End If

shell.Run cmd, 0, False

Set fso = Nothing
Set shell = Nothing
