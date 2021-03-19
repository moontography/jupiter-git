# jupiter-git

A small git server that persists repositories (as a gzipped tarball) in the [Jupiter blockchain](https://gojupiter.tech). When you run this server, you can begin adding git remotes to your project repositories to this server and push/pull/clone as you would any git remote.

```sh
$ git remote add jup http://localhost:8000/JUP-XXX-XXX-XXXX/my-repo
$ git push jup master

Username for 'http://localhost:8000': JUP-XXX-XXX-XXXX
Password for 'http://JUP-XXX-XXX-XXXX@localhost:8000':
Enumerating objects: 379, done.
Counting objects: 100% (379/379), done.
Delta compression using up to 4 threads
Compressing objects: 100% (374/374), done.
Writing objects: 100% (379/379), 139.07 KiB | 3.31 MiB/s, done.
Total 379 (delta 240), reused 0 (delta 0)
remote: Resolving deltas: 100% (240/240), done.
To http://localhost:8000/JUP-XXX-XXX-XXXX/my-repo
 * [new branch]      master -> master
```

## Install & Run

The quickest way to run the server is with docker and docker-compose. If you have these installed, you should be able to execute the following in a terminal and get a server running on http://localhost:8000.

```sh
$ git clone https://github.com/whatl3y/jupiter-git
$ cd jupiter-get
$ touch .env
$ docker-compose up

Creating jupiter-git_web_1 ... done
Attaching to jupiter-git_web_1
web_1  |
web_1  | > jupiter-git@0.0.1 start /usr/jupiter-git
web_1  | > node dist/bin/jupiter-git.js
web_1  |
web_1  | 2021-03-19 01:20:32.821  MASTER  start..
web_1  | 2021-03-19 01:20:32.840  MASTER  ..started at port 8000
web_1  | 2021-03-19 01:20:32.841  WORKERS  start..
web_1  | 2021-03-19 01:20:32.851  WORKER #1  ..started
web_1  | {"name":"jupiter-git","hostname":"1d24bc879d10","pid":28,"level":30,"msg":"listening on *:8000","time":"2021-03-19T01:20:33.362Z","v":0}
```

# Tips w/ cryptocurrency

I love FOSS (free and open source software) and for the most part don't want to charge for the software I build. It does however take a good bit of time keeping up with feature requests and bug fixes, so if you have the desire and ability to send me a free coffee, it would be greatly appreciated!

- Bitcoin (BTC): `3D779dP5SZo4szHivWHyFd6J2ESumwDmph`
- Ethereum (ETH and ERC-20 tokens): `0xF3ffa9706b3264EDd1DAa93D5F5D70C8f71fAc99`
- Stellar (XLM): `GACH6YMYFZ574FSGCV7IJXTGETEQL3DLQK64Z6DFGD57PZL5RH6LYOJT`
- Jupiter (JUP) mainnet: `JUP-TUWZ-4B8Z-9REP-2YVH5`
