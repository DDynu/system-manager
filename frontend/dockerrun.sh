docker build -t system-manager .
docker rm -f system-manager 2>&1
docker run --name system-manager -d -p 8085:80 system-manager:latest
