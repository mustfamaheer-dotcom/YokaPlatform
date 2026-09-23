# Build frontend with updated API URL
Write-Host ">>> [1/4] Building client-swm..."
npm --prefix client-swm run build

# Prepare deployment folder
$deployDir = "dist-deploy"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy frontend static build into deployDir
Write-Host ">>> [2/4] Copying frontend static assets..."
Copy-Item -Recurse -Force "client-swm\dist\*" $deployDir

# Bundle server into single standalone server.js
Write-Host ">>> [3/4] Bundling backend server.js with esbuild..."
npx -y esbuild server/swm/app.js --bundle --platform=node --target=node20 --outfile="$deployDir\server.js"

# Write IIS web.config with httpPlatformHandler
Write-Host ">>> [4/4] Writing production web.config..."
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
