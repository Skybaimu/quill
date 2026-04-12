; Quill 自定义安装目录
; 优先安装到 D:\Program Files\Quill
; 没有 D 盘则使用默认 C:\Program Files\Quill

!macro NSIS_HOOK_PREINSTALL
  ; 检查 D: 盘是否存在
  IfFileExists "D:\*.*" 0 +3
    StrCpy $INSTDIR "D:\Program Files\Quill"
    Goto done
  StrCpy $INSTDIR "$PROGRAMFILES\Quill"
  done:
!macroend
