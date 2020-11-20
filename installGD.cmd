rem disable startup manually
rem invertigate reg query HKCU\\Software... and wmic startup
nssm.exe install gdrive "C:\Program Files\Google\Drive File Stream\43.0.8.0\GoogleDriveFS.exe"
nssm set gdrive DisplayName gdrive
nssm set gdrive ObjectName .\pris pass
nssm set gdrive Start SERVICE_AUTO_START
