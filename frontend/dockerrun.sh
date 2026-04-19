docker build -t system-manager .
docker run --name system-manager -d -p 8085:80 system-manager:latest
