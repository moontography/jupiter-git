import fs from 'fs'
import path from 'path'
import JupiterFs from 'jupiter-fs'
import GitHelpers from './GitHelpers'
import FileManagement from './FileManagement'
import { IFactoryOptions, IStringMap } from '../types'
import config from '../config'

// import Server from 'node-git-server'
const Server = require('node-git-server')

interface IAuthOptions {
  type: string
  repo: string
  user(
    check: (username: string, password: string) => Promise<void>
  ): Promise<void>
}

export default function GitServer(
  { log }: IFactoryOptions,
  rootDir: string = path.join(config.app.rootDir, 'tmp', 'git')
) {
  const fileMgmt = FileManagement()
  const helpers = GitHelpers({ log }, rootDir)
  const user: IStringMap = {}

  return {
    user,

    async create(jupAddy: string, autoCreate: boolean = true): Promise<any> {
      const filePath = path.join(rootDir, jupAddy)
      const repos = new Server(filePath, {
        autoCreate,
        authenticate: this.handleAuth.bind(this),
      })
      repos.on('push', this.onPush.bind(this))
      repos.on('fetch', this.onFetch.bind(this))

      return repos
    },

    async handleAuth({ type, repo, user }: IAuthOptions) {
      return await new Promise((resolve, reject) => {
        user(
          async (jupAddy: string, passphrase: string): Promise<void> => {
            try {
              log.debug(
                `git auth handler`,
                jupAddy,
                `${passphrase.slice(0, 2)}......${passphrase.slice(-2)}`
              )

              if (config.app.masterKey && passphrase === config.app.masterKey) {
                log.debug(
                  `git client key used to authenticate with repo`,
                  type,
                  repo
                )
              } else {
                // check that the passphrase provided is for the JUP address
                const jupFs = JupiterFs({
                  server: config.jupiter.server,
                  address: jupAddy,
                  passphrase,
                  feeNQT: 1500,
                })
                const info = await jupFs.client.getAddressFromPassphrase(
                  passphrase
                )
                log.debug(`full auth info`, info)
                if (jupAddy.toLowerCase() !== info.address.toLowerCase()) {
                  throw new Error(
                    `Please make sure your git remote URL has the correct JUP-XXX address (i.e. https://URL/:JUP_ADDRESS/REPO) and you enter the correct passphrase`
                  )
                }
                this.user = { ...info, passphrase }
              }

              if (type === 'fetch') {
                const repoDirExists = await fileMgmt.doesDirectoryExist(
                  path.join(rootDir, this.user.address, `${repo}.git`)
                )
                if (!repoDirExists) {
                  await helpers.untarRepo(jupAddy, passphrase, repo)
                }
              }

              resolve(null)
            } catch (err) {
              log.error(`auth error`, err)
              reject(err)
            }
          }
        )
      })
    },

    onPush(push: IStringMap): void {
      push.accept()
      push.res.on(
        'finish',
        async (): Promise<void> => {
          try {
            await this.handlePush(push)
          } catch (err) {
            log.error(`Error handling push`, err)
          }
        }
      )
    },

    onFetch(fetch: IStringMap): void {
      fetch.accept()
      fetch.res.on(
        'finish',
        async (): Promise<void> => {
          try {
            log.info(`fetching repo: ${fetch.repo} -- ${fetch.commit}`)
          } catch (err) {
            log.error(`Error handling fetch`, err)
          }
        }
      )
    },

    async handlePush(push: IStringMap) {
      try {
        log.info(`git handle push`)
        const tarInfo = await helpers.tarRepo(this.user.address, push.repo)
        log.debug(`repo tar info`, tarInfo)

        const jupFs = JupiterFs({
          server: config.jupiter.server,
          address: this.user.address,
          passphrase: this.user.passphrase,
          feeNQT: 1500,
        })
        const fileBuffer: Buffer = await new Promise((resolve, reject) => {
          let data: any[] = []
          fs.createReadStream(tarInfo.path)
            .on('error', reject)
            .on('data', (chunk: any) => data.push(chunk))
            .on('end', () => resolve(Buffer.concat(data)))
        })

        log.debug(`repo tarball buffer length`, fileBuffer.length)
        await jupFs.writeFile(helpers.getRepoFilename(push.repo), fileBuffer)
        await helpers.deleteLocalRepoDir(this.user.address, push.repo)

        log.info(`successfully pushed repo ${push.repo} to jupiter!`)
      } catch (err) {
        log.error(`error handling push for repo ${push.repo}`, err)
        throw err
      }
    },
  }
}
