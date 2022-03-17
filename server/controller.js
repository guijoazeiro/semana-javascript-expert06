import { Service } from "./service.js";

export class Controller {
    constructor() {
        this.service = new Service()
    }

    async getFileStream(filename) {
        return this.service.getFileStrem(filename)
    }

    createClientStream() {
        const { id, clientStreams } = this.service.createClientStream()

        const onClose = () => {
            logger.info(`Closing connection of ${id}`)
            this.service.removeClientStream(id)
        }
        return {
            stream: clientStreams,
            onClose

        }
    }

}