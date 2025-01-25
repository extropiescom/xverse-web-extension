# 如何连接模拟器
1. 点击 VSCode -> “Update Container”，在 terminal 获取命令，然后参考下面 mac 上的命令修改。主要得加上“-p 3344:5000”绑定。
```bash
xhost + ; docker run -p 3344:5000 --user $(id -u):$(id -g) --privileged -e DISPLAY='host.docker.internal:0' -v '/tmp/.X11-unix:/tmp/.X11-unix' -v '/Users/1mcat/Project/Ledger/app-bitcoin-new:/app' -t -d --name app-bitcoin-new-container ghcr.io/ledgerhq/ledger-app-builder/ledger-app-dev-tools:latest
```

2. open terminal
```bash
docker exec -it -u 0 app-bitcoin-new-container bash -c 'export BOLOS_SDK=$NANOSP_SDK && bash'  
```

3. build
```bash
export BOLOS_SDK=$(echo $NANOSP_SDK) && make -C ./ -B -j  COIN=bitcoin_testnet
```

4. run emulator
```bash
speculos --model nanosp build/nanos2/bin/app.elf
```

5. npm install

6. npm run start

7. chrome 里 load extension
