import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import tar from 'tar'
import JupiterFs from 'jupiter-fs'
import GitClient, { clientRootDir } from './GitClient'
import FileManagement from './FileManagement'
import { IFactoryOptions, IStringMap } from '../types'
import config from '../config'

export default function GitHelpers(
  { log }: IFactoryOptions,
  rootDir = path.join(config.app.rootDir, 'tmp', 'git')
): IStringMap {
  const fileMgmt = FileManagement()

  return {
    async doesLocalRepoExist(
      jupAddy: string,
      repoName: string
    ): Promise<boolean> {
      return await fileMgmt.doesDirectoryExist(
        path.join(clientRootDir, jupAddy, repoName)
      )
    },

    async createLocalRepoDir(
      jupAddy: string,
      repoName: string
    ): Promise<string> {
      const fullDirPath: string = path.join(clientRootDir, jupAddy, repoName)
      await fileMgmt.checkAndCreateDirectoryOrFile(fullDirPath)
      return fullDirPath
    },

    async getRepoFilesInDir(
      jupAddy: string,
      repoName: string,
      baseDir: null | string = null
    ): Promise<object[]> {
      const modifiedRepoForLstree: string = baseDir
        ? path.join(repoName, baseDir)
        : repoName
      const g = GitClient(modifiedRepoForLstree, jupAddy)
      const rawTreeInfo: string = await g.gitClient.raw(['ls-tree', 'HEAD'])
      const processedFiles = await Promise.all(
        rawTreeInfo
          .split('\n')
          .filter((i) => !!i)
          .map(async (i: string) => {
            const [blobInfo, file] = i.split('\t')
            try {
              const fullPath = path.join(g.workingDir, file)
              const stat = await fileMgmt.getFileInfo(fullPath)
              const fileType = await fileMgmt.getFileType(fullPath)
              return { blobInfo, file: { stat, fileType, name: file } }
            } catch (err) {
              return {
                blobInfo,
                file: { stat: {}, fileType: 'file', name: file },
              }
            }
          })
      )

      return processedFiles.sort((f1: any, f2: any) => {
        if (f1.file.fileType !== f2.file.fileType) {
          return f1.file.fileType === 'directory' ? -1 : 1
        }
        return f1.file.name.toLowerCase() < f2.file.name.toLowerCase() ? -1 : 1
      })
    },

    getFileStreamInRepo(
      jupAddy: string,
      repoName: string,
      filePathInRepo: string
    ): fs.ReadStream {
      const git = GitClient(repoName, jupAddy)
      return fs.createReadStream(path.join(git.workingDir, filePathInRepo))
    },

    async deleteLocalRepoDir(jupAddy: string, repoName: string): Promise<void> {
      const fullDirPath: string = path.join(clientRootDir, jupAddy, repoName)
      await fileMgmt.deleteDir(fullDirPath)
    },

    async checkAndCreateRepo(
      jupAddy: string,
      repoOrObjectId: string
    ): Promise<void> {
      if (await this.doesLocalRepoExist(jupAddy, repoOrObjectId)) return
      await this.createLocalRepoDir(jupAddy, repoOrObjectId)
    },

    async tarRepo(jupAddy: string, repoName: string): Promise<IStringMap> {
      const repoTarFilename = this.getRepoFilename(repoName)
      const filePath = path.join(rootDir, jupAddy)
      const fullRepoTarPath = path.join(filePath, repoTarFilename)

      await tar.c(
        {
          // onwarn: (code: number | string, message: string, data: any) =>
          //   log.error(`Error with tar.c`, code, message, data),
          gzip: true,
          strict: true,
          file: fullRepoTarPath,
          cwd: filePath,
        },
        [`${repoName}.git`]
      )

      return {
        dir: filePath,
        name: repoTarFilename,
        path: fullRepoTarPath,
      }
    },

    async untarRepo(
      jupAddy: string,
      passphrase: string,
      repoName: string
    ): Promise<void> {
      const userGitDir = path.join(rootDir, jupAddy)
      await fileMgmt.checkAndCreateDirectoryOrFile(userGitDir)

      const jupFs = JupiterFs({
        server: config.jupiter.server,
        address: jupAddy,
        passphrase,
      })
      const files = await jupFs.ls()
      log.debug(`all files:`, files.map((f: any) => f.fileName).join(', '))
      const repoFile = files.find(
        (f: any) => f.fileName == this.getRepoFilename(repoName)
      )
      if (!repoFile)
        throw new Error(`We did not file the repository for repo ${repoName}.`)

      // const readStream: Readable = await jupFs.getFileStream({
      //   name: repoFile.fileName,
      // })
      const fileBuffer = await jupFs.getFile({
        name: repoFile.fileName,
      })
      const readStream = new Readable()
      readStream._read = () => {} // _read is required but NOOPing it
      readStream.push(fileBuffer)
      readStream.push(null)
      readStream.pipe(
        tar.x({
          // onwarn: (code: number | string, message: string, data: any) =>
          //   log.error(`Error with tar.x`, code, message, data),
          strict: true,
          cwd: userGitDir,
        })
      )

      return await new Promise((resolve, reject) => {
        readStream.on('error', reject).on('end', () => resolve())
      })
    },

    getRepoFilename(repo: string) {
      return `jupiter-git-${repo}.git.tar.gz`
    },
  }
}
