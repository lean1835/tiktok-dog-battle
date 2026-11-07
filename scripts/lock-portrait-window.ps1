param([string]$ProfileDirectory = $env:TUAT_CAPTURE_PROFILE_DIR)
$ErrorActionPreference = 'Stop'
if([string]::IsNullOrWhiteSpace($ProfileDirectory)) { throw 'Thieu thu muc profile cua san doc.' }
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class TuatPortraitWindow {
 public delegate bool EnumProc(IntPtr window, IntPtr data);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor, Work; public int Flags; }
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr data);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int max);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr window, int index);
 [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] public static extern IntPtr SetWindowLongPtr(IntPtr window, int index, IntPtr value);
 [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
 [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr window);
 [DllImport("user32.dll")] public static extern bool AdjustWindowRectExForDpi(ref RECT rect, uint style, bool menu, uint exStyle, uint dpi);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
 [DllImport("user32.dll")] public static extern IntPtr GetSystemMenu(IntPtr window, bool revert);
 [DllImport("user32.dll")] public static extern bool DeleteMenu(IntPtr menu, uint position, uint flags);
 [DllImport("user32.dll")] public static extern bool DrawMenuBar(IntPtr window);
}
'@
[void][TuatPortraitWindow]::SetProcessDPIAware()
$profilePath = [IO.Path]::GetFullPath($ProfileDirectory)
$targetWindow = [IntPtr]::Zero
$launched=$false; $deadline=[DateTime]::UtcNow.AddSeconds(25)
while([DateTime]::UtcNow -lt $deadline -and $targetWindow -eq [IntPtr]::Zero) {
 $browserIds = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($profilePath,[StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { [uint32]$_.ProcessId })
 $found = [Collections.Generic.List[IntPtr]]::new()
 $callback = [TuatPortraitWindow+EnumProc]{ param($window,$data)
  [uint32]$ownerId=0; [void][TuatPortraitWindow]::GetWindowThreadProcessId($window,[ref]$ownerId)
  if($browserIds -contains $ownerId -and [TuatPortraitWindow]::IsWindowVisible($window)) {
   $title=[Text.StringBuilder]::new(512); [void][TuatPortraitWindow]::GetWindowText($window,$title,512)
   if($title.ToString() -like '*9:16*') { $found.Add($window) }
  }
  return $true
 }
 [void][TuatPortraitWindow]::EnumWindows($callback,[IntPtr]::Zero)
 if($found.Count -ge 1) { $targetWindow=$found[0] } else {
  if(!$launched) {
   $browserArgs=@("--app=$env:TUAT_CAPTURE_URL", "--user-data-dir=`"$profilePath`"", '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--window-size=540,992', '--window-position=40,0')
   Start-Process -FilePath $env:TUAT_CAPTURE_BROWSER_PATH -ArgumentList $browserArgs -WindowStyle Normal
   $launched=$true
  }
  Start-Sleep -Milliseconds 250
 }
}
if($targetWindow -eq [IntPtr]::Zero) { throw 'Khong tim thay dung cua so san doc de khoa kich thuoc.' }
# Only this game's dedicated Edge/Chrome profile is eligible; never alter other windows.
$style=([TuatPortraitWindow]::GetWindowLongPtr($targetWindow,-16)).ToInt64() -band (-bnot 0x00070000L)
[void][TuatPortraitWindow]::SetWindowLongPtr($targetWindow,-16,[IntPtr]$style)
$extended=([TuatPortraitWindow]::GetWindowLongPtr($targetWindow,-20)).ToInt64()
$monitor=[TuatPortraitWindow+MONITORINFO]::new(); $monitor.Size=[Runtime.InteropServices.Marshal]::SizeOf($monitor)
[void][TuatPortraitWindow]::GetMonitorInfo([TuatPortraitWindow]::MonitorFromWindow($targetWindow,2),[ref]$monitor)
$dpi=[TuatPortraitWindow]::GetDpiForWindow($targetWindow)
$frame=[TuatPortraitWindow+RECT]::new()
[void][TuatPortraitWindow]::AdjustWindowRectExForDpi([ref]$frame,[uint32]$style,$false,[uint32]$extended,$dpi)
$height=$monitor.Work.Bottom-$monitor.Work.Top
$clientHeight=$height-($frame.Bottom-$frame.Top)
$width=[int][Math]::Round($clientHeight*9/16)+($frame.Right-$frame.Left)
$left=$monitor.Work.Left+[int][Math]::Round((($monitor.Work.Right-$monitor.Work.Left)-$width)/2)
if(![TuatPortraitWindow]::SetWindowPos($targetWindow,[IntPtr]::Zero,$left,$monitor.Work.Top,$width,$height,0x0074)) { throw 'Khong dat duoc kich thuoc cua so.' }
$menu=[TuatPortraitWindow]::GetSystemMenu($targetWindow,$false)
foreach($command in @(0xF000,0xF020,0xF030)) { [void][TuatPortraitWindow]::DeleteMenu($menu,$command,0) }
[void][TuatPortraitWindow]::DrawMenuBar($targetWindow)
if((([TuatPortraitWindow]::GetWindowLongPtr($targetWindow,-16)).ToInt64() -band 0x00070000L) -ne 0) { throw 'Khoa keo kich thuoc/phong cua so chua thanh cong.' }
Write-Output "Portrait window locked: $width x $height, full work area height."

