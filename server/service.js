import fs from 'fs'
import config from './config.js'
import { randomUUID } from 'crypto'
import { join, extname } from 'path'
import fsPromises from 'fs/promises'
import { PassThrough, Writable } from 'stream'
import Throttle from 'throttle'
import childProcess from 'child_process'
import { logger } from './util.js'
import streamsPromises from 'stream/promises'
import { once } from 'events'


const {
    dir: {
        publicDirectory
    },
    constants: {
        fallbckBitrate,
        englishConversation,
        bitRateDivisor
    }
} = config

export class Service {
    constructor() {
        this.clientStreams = new Map()
        this.currentSong = englishConversation
        this.currentBitRate = 0
        this.throttleTransform = {}
        this.currentReadable = {}
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

    async getBitRate(song) {
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

    broadCast() {
        return new Writable({
            write: (chunk, enc, cb) => {
                for (const [id, stream] of this.clientStreams) {
                    // se o cliente descontou não devemos mais mandar dados pra ele
                    if (stream.writableEnded) {
                        this.clientStreams.delete(id)
                        continue;
                    }

                    stream.write(chunk)
                }

                cb()
            }
        })
    }

    async startStreamming() {
        logger.info(`starting with ${this.currentSong}`)
        const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong)) / bitRateDivisor
        const throttleTransform = this.throttleTransform = new Throttle(bitRate)
        const songReadable = this.currentReadable = this.createFileStream(this.currentSong)
        return streamsPromises.pipeline(
            songReadable,
            throttleTransform,
            this.broadCast()
        )
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