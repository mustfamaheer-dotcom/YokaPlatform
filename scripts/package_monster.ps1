# Build frontends
Write-Host ">>> [1/5] Building client-swm (Admin Panel)..."
npm --prefix client-swm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> [2/5] Building client-ecp (Storefront)..."
npm --prefix client-ecp run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Prepare deployment folder
$deployDir = "dist-deploy"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null
New-Item -ItemType Directory -Path "$deployDir\logs" | Out-Null

# Copy frontend static builds into deployDir maintaining folder hierarchy
Write-Host ">>> [3/5] Copying frontend static assets..."
New-Item -ItemType Directory -Path "$deployDir\client-swm\dist" -Force | Out-Null
Copy-Item -Recurse -Force "client-swm\dist\*" "$deployDir\client-swm\dist"

New-Item -ItemType Directory -Path "$deployDir\client-ecp\dist" -Force | Out-Null
Copy-Item -Recurse -Force "client-ecp\dist\*" "$deployDir\client-ecp\dist"

if (Test-Path "img") {
    New-Item -ItemType Directory -Path "$deployDir\img" -Force | Out-Null
    Copy-Item -Recurse -Force "img\*" "$deployDir\img"
}

# Bundle server into single standalone server.js
Write-Host ">>> [4/5] Bundling backend server.js with esbuild..."
npx -y esbuild server/swm/app.js --bundle --platform=node --target=node20 --outfile="$deployDir\server.js"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Write IIS web.config with httpPlatformHandler
Write-Host ">>> [5/5] Writing production web.config..."
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>
    
    <httpPlatform processPath="node" arguments=".\server.js" startupTimeLimit="60" stdoutLogEnabled="true" stdoutLogFile=".\logs\node">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
        <environmentVariable name="DB_CLIENT" value="pg" />
        <environmentVariable name="DB_HOST" value="db69837.public.databaseasp.net" />
        <environmentVariable name="DB_PORT" value="5432" />
        <environmentVariable name="DB_NAME" value="db69837" />
        <environmentVariable name="DB_USER" value="db69837" />
        <environmentVariable name="DB_PASS" value="5Tq#_o3L9Zx!" />
        <environmentVariable name="DB_SSL" value="true" />
        <environmentVariable name="JWT_SECRET" value="yoka_jwt_secret_dev_key_2026_moustafa_maher" />
      </environmentVariables> 
    </httpPlatform>
  </system.webServer>
</configuration>
"@

Set-Content -Path "$deployDir\web.config" -Value $webConfig -Encoding UTF8

Write-Host "Deploy folder ready at $deployDir"
