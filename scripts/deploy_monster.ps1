$sourcePath = (Resolve-Path "dist-deploy").Path
$msdeploy = "C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe"

Write-Host "Deploying full-stack package from: $sourcePath to site93498 via MSDeploy (with AppOffline and skip logs)..."

cmd.exe /c "`"$msdeploy`" -verb:sync -source:contentPath=`"$sourcePath`" -dest:contentPath=`"site93498`",computerName=`"https://site93498.siteasp.net:8172/msdeploy.axd?site=site93498`",userName=`"site93498`",password=`"2Wp@-q8SeE=7`",authType=`"Basic`" -enableRule:AppOffline -skip:objectName=filePath,absolutePath=`".*\\logs\\.*`" -skip:objectName=dirPath,absolutePath=`".*\\logs.*`" -allowUntrusted"
