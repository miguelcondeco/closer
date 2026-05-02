import pino from 'pino'

const logger = pino({ level: 'info' })

// BullMQ workers arrive in Session 8
logger.info({ msg: 'Workers stub running — BullMQ arrives in Session 8' })
