; ==============================================================================
; XRAR — Extreme Compression Archive: Inno Setup Script
; ==============================================================================

#define MyAppName "XRAR"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "En-Dhiaa"
#define MyAppURL "https://github.com/En-Dhiaa/xrar"
#define MyAppExeName "xrar.exe"

[Setup]
AppId={{5E27F431-7C64-4F98-A8F5-8C5768D65F34}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\..\LICENSE
OutputDir=..\..\dist
OutputBaseFilename=XRAR-{#MyAppVersion}-x64-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
ChangesAssociations=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "shellex"; Description: "Integrate into Windows Explorer Right-Click Context Menu"; GroupDescription: "Windows Shell Integration:"
Name: "assocxrar"; Description: "Associate .xrar files with XRAR"; GroupDescription: "File Associations:"

[Files]
Source: "C:\Users\USER\.cargo_target\xrar\release\xrar.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\scripts\register_explorer_context_menu.reg"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Associate .xrar format
Root: HKA; Subkey: "Software\Classes\.xrar"; ValueType: string; ValueName: ""; ValueData: "XRAR.Archive"; Flags: uninsdeletevalue; Tasks: assocxrar
Root: HKA; Subkey: "Software\Classes\XRAR.Archive"; ValueType: string; ValueName: ""; ValueData: "XRAR Archive"; Flags: uninsdeletekey; Tasks: assocxrar
Root: HKA; Subkey: "Software\Classes\XRAR.Archive\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"; Tasks: assocxrar
Root: HKA; Subkey: "Software\Classes\XRAR.Archive\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" list ""%1"""; Tasks: assocxrar

; Context menu integration
Root: HKA; Subkey: "Software\Classes\*\shell\XRAR"; ValueType: string; ValueName: "MUIVerb"; ValueData: "XRAR"; Flags: uninsdeletekey; Tasks: shellex
Root: HKA; Subkey: "Software\Classes\*\shell\XRAR"; ValueType: string; ValueName: "SubCommands"; ValueData: ""; Tasks: shellex
Root: HKA; Subkey: "Software\Classes\*\shell\XRAR\shell\AddToArchive"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Add to .xrar (Smart Mode)"; Tasks: shellex
Root: HKA; Subkey: "Software\Classes\*\shell\XRAR\shell\AddToArchive\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" create ""%1.xrar"" ""%1"""; Tasks: shellex

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
