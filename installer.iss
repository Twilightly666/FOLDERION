#define AppName "FOLDERION"
#define AppVersion "1.0"
#define AppPublisher "Twilightly"
#define AppExe "FOLDERION.exe"

[Setup]
AppId={{6E9E7E74-EFCA-484A-ADA0-79B18E20BFF4}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=installer
OutputBaseFilename={#AppName}_Setup_{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#AppExe}
CloseApplications=yes
#ifexist "app.ico"
SetupIconFile=app.ico
#endif

[Languages]
Name: "ukrainian"; MessagesFile: "compiler:Languages\Ukrainian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
ukrainian.TaskStartMenu=Створити ярлик у меню «Пуск»
ukrainian.NoWebView2=На цьому комп’ютері не знайдено Microsoft Edge WebView2 Runtime, без нього FOLDERION не запуститься.%n%nВстановіть його з сайту Microsoft (Evergreen Runtime) і запустіть цей інсталятор ще раз, або продовжіть встановлення зараз.%n%nПродовжити?
english.TaskStartMenu=Create a Start menu shortcut
english.NoWebView2=Microsoft Edge WebView2 Runtime was not found on this computer. FOLDERION will not start without it.%n%nInstall it from Microsoft (Evergreen Runtime) and run this installer again, or continue the installation now.%n%nContinue?

[Tasks]
Name: "startmenuicon"; Description: "{cm:TaskStartMenu}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\{#AppName}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: startmenuicon
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
const
  WebView2Key = 'Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function WebView2Installed: Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(HKLM32, 'SOFTWARE\' + WebView2Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
  if not Result then
    Result := RegQueryStringValue(HKCU, 'Software\' + WebView2Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
end;

function InitializeSetup: Boolean;
begin
  Result := True;
  if not WebView2Installed then
    Result := MsgBox(ExpandConstant('{cm:NoWebView2}'), mbConfirmation, MB_YESNO) = IDYES;
end;
