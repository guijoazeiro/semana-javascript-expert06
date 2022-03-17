import fs from 'fs'
import config from './config.js'
import { randomUUID } from 'crypto'
import { join, extname } from 'path'
import fsPromises from 'fs/promises'
import { PassThrough } from 'stream'
import { } from 'throttle'
import childProcess from 'child_process'
import { logger } from './util.js'

const {
    dir: {
        publicDirectory
    },
    constants: {
        fallbckBitrate
    }
} = config

export class Service {
    constructor() {
        this.clientStreams = new Map()
    }

    createClientStream() {
        const id = randomUUID()
        const clientStreams = new PassThrough()
        this.clientStreams.set(id, clientStreams)

        return {
            id,
            clientStreams
        }
    }
    removeClientStream(id) {
        this.clientStreams.delete(id)
    }

    _executeSouxCommand(args) {
        return childProcess.spawn('sox', args)
    }

    async getBitRage(song) {
        try {
            const args = [
                '--i', //info
                '--B',//bitrate
                song
            ]
            const {
                stderr,
                stdout,
                stdin } = this._executeSouxCommand(args)

            await Promise.all([
                once(stderr, 'readable'),
                once(stdout, 'readable'),
            ])

            const [success, error] = [stdout, stderr].map(stream => stream.read())
            if (error) return await Promise.reject(error)
            return success
                .toString()
                .trim()
                .replace(/k/, '000')

        } catch (error) {
            logger.error(`error no bitrate ${error} `)
            return fallbckBitrate
        }
    }

    createFileStream(filename) {
        return fs.createReadStream(filename)
    }

    async getFileInfo(file) {
        const fullFilePath = join(publicDirectory, file)
        await fsPromises.access(fullFilePath)
        const fileType = extname(fullFilePath)
        return {
            type: fileType,
            name: fullFilePath
        }
    }

    async getFileStrem(file) {
        const { name, type } = await this.getFileInfo(file)
        return {
            stream: this.createFileStream(name),
            type
        }
    }
}