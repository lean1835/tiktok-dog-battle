$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$tuatSynth = $null
$tuatWave = $null
$tuatFormat = $null
$tuatCategory = $null
$tuatTokens = $null
$tuatVoice = $null
try {
    $tuatRequest = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $tuatText = [string]$tuatRequest.text
    if ($tuatText.Length -lt 1 -or $tuatText.Length -gt 240) { throw 'Invalid speech text length.' }
    foreach ($tuatPath in @('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices', 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices')) {
        try {
            $tuatCategory = New-Object -ComObject SAPI.SpObjectTokenCategory
            $tuatCategory.SetId($tuatPath, $false)
            $tuatTokens = $tuatCategory.EnumerateTokens('Language=42A')
            if ($tuatTokens.Count -gt 0) { $tuatVoice = $tuatTokens.Item(0); break }
        } catch { }
    }
    if ($null -eq $tuatVoice) { throw 'No installed Vietnamese Windows voice.' }
    $tuatSynth = New-Object -ComObject SAPI.SpVoice
    $tuatSynth.Voice = $tuatVoice
    $tuatWave = New-Object -ComObject SAPI.SpMemoryStream
    $tuatFormat = New-Object -ComObject SAPI.SpAudioFormat
    $tuatFormat.Type = 22 # SAFT22kHz16BitMono: 22050 Hz, signed 16-bit mono PCM.
    $tuatWave.Format = $tuatFormat
    $tuatSynth.AllowAudioOutputFormatChangesOnNextSet = $false
    $tuatSynth.AudioOutputStream = $tuatWave
    [void]$tuatSynth.Speak($tuatText, 16) # SVSFIsNotXML: viewer names are plain text.
    $tuatBytes = [byte[]]$tuatWave.GetData()
    if ($tuatBytes.Length -gt 2097152) { throw 'Speech audio exceeds size limit.' }
    @{ voice = $tuatVoice.GetDescription(); sampleRate = 22050; pcm = [Convert]::ToBase64String($tuatBytes) } | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
} finally {
    foreach ($tuatObject in @($tuatSynth, $tuatWave, $tuatFormat, $tuatVoice, $tuatTokens, $tuatCategory)) {
        if ($null -ne $tuatObject) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($tuatObject) }
    }
}
