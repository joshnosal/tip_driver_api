import { Router } from 'express'
import { companyAuthMiddleware } from './tools'
import stripe from '../utils/stripe'

const terminalRouter = Router()

terminalRouter.get('/connection_token', async (req, res, next) => {
  try {
    res.send(await stripe.terminal.getConnectionToken())
  } catch(e) {
    res.sendStatus(500)
  }
})

export default terminalRouter

