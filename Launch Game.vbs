Set WshShell = CreateObject("WScript.Shell")
' Run the batch file in a completely hidden window (0) so no black CMD window clutter sits on the desktop
WshShell.Run "cmd.exe /c launch.bat", 0, False
