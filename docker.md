how to run docker

make sure docker desktop is running:
  
we run the compose file up.  -d is detached mode (just runs in background )
  docker compose up  -d      

if we use -d

when we get the docker image up we need

check the status of containers
docker ps

we can pull the logs 
docker logs agent_arena-mc-1

we can pull the logs and appened them (turn into logging terminal)
docker logs agent_arena-mc-1 -f

Docker
example 
    mohiuddinsyed@Mohiuddins-MacBook-Pro Agent_Arena % docker ps 
    CONTAINER ID   IMAGE                          COMMAND                  CREATED         STATUS                   PORTS                                             NAMES
    d50086ec1aea   itzg/minecraft-server:latest   "/image/scripts/start"   5 minutes ago   Up 3 minutes (healthy)   0.0.0.0:25565->25565/tcp, [::]:25565->25565/tcp   agent_arena-mc-1