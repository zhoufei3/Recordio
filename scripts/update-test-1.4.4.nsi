; Small update-only installer for testing the 1.4.3 -> 1.4.4 updater.
; Keep the existing Electron runtime and native helpers. Not a fresh installer.
Unicode true
Name "Recordio 1.4.4 更新测试"
OutFile "..\release\Recordio-1.4.4-update-test-windows-x64.exe"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "1.4.4.0"
VIAddVersionKey "ProductName" "Recordio 更新测试"
VIAddVersionKey "FileDescription" "Recordio 1.4.4 update-only test installer"
VIAddVersionKey "FileVersion" "1.4.4"
VIAddVersionKey "LegalCopyright" "Recordio contributors"

!include "LogicLib.nsh"
!define APP_KEY "Software\a067b359-fd22-59b3-b7d3-fa75df2b0eca"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\a067b359-fd22-59b3-b7d3-fa75df2b0eca"
Page instfiles

Function .onInit
  ReadRegStr $INSTDIR HKCU "${APP_KEY}" "InstallLocation"
  ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "DisplayVersion"
  ${If} $0 != "1.4.3"
  ${AndIf} $0 != "1.4.4"
    MessageBox MB_OK|MB_ICONSTOP "此测试更新包仅适用于已安装的 Recordio 1.4.3，不能用于首次安装。"
    SetErrorLevel 1
    Abort
  ${EndIf}
  IfFileExists "$INSTDIR\Recordio.exe" 0 invalid
  IfFileExists "$INSTDIR\resources\app.asar" ready invalid
  invalid:
    MessageBox MB_OK|MB_ICONSTOP "未找到已安装的 Recordio，请先安装完整的 1.4.3。"
    SetErrorLevel 1
    Abort
  ready:
FunctionEnd

Section "Update"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=app.asar "..\release\win-unpacked\resources\app.asar"
  ; Stage the payload before touching the existing application.
  ClearErrors
  CopyFiles /SILENT "$PLUGINSDIR\app.asar" "$INSTDIR\resources\app.asar.update-test"
  IfErrors failed
  StrCpy $1 0
  retry:
    ClearErrors
    ; Preserve the previous application until installation succeeds.
    Rename "$INSTDIR\resources\app.asar" "$INSTDIR\resources\app.asar.update-backup"
    IfErrors wait replace
  wait:
    IntOp $1 $1 + 1
    ${If} $1 < 15
      Sleep 1000
      Goto retry
    ${EndIf}
    Goto failed
  replace:
    ClearErrors
    Rename "$INSTDIR\resources\app.asar.update-test" "$INSTDIR\resources\app.asar"
    IfErrors rollback
    Delete "$INSTDIR\resources\app.asar.update-backup"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "1.4.4"
    Goto done
  rollback:
    Rename "$INSTDIR\resources\app.asar.update-backup" "$INSTDIR\resources\app.asar"
  failed:
    Delete "$INSTDIR\resources\app.asar.update-test"
    MessageBox MB_OK|MB_ICONSTOP "更新未完成，原版本已保留。请关闭 Recordio 后重试。"
    SetErrorLevel 1
    Abort
  done:
SectionEnd

Function .onInstSuccess
  Exec '"$INSTDIR\Recordio.exe"'
FunctionEnd
