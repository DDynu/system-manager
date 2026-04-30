#!//bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
docker build -t system-manager .
docker rm -f system-manager 2>&1
docker run --name system-manager --restart unless-stopped -d -p 8085:80 system-manager:latest
