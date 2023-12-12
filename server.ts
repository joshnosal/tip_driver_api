
import 'dotenv/config'
import express, { Request, Application } from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import { ClerkExpressWithAuth, RequireAuthProp, StrictAuthProp } from '@clerk/clerk-sdk-node'
import companyRouter from './routes/company'
import appRouter from './routes/app'
import terminalRouter from './routes/terminal'
import userRouter from './routes/user'
import deviceRouter from './routes/device'
import subscriptionRouter from './routes/subscription'
import stripeRouter from './routes/stripe'
import cors from 'cors'

const PORT = process.env.PORT || 4000
const app: Application = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())


// Establish routes
export type UserAuthRequest = RequireAuthProp<Request>
app.use('/company', ClerkExpressWithAuth({}), companyRouter)
app.use('/app', ClerkExpressWithAuth({}), appRouter)
app.use('/terminal', ClerkExpressWithAuth({}), terminalRouter)
app.use('/user', userRouter)
app.use('/device', ClerkExpressWithAuth({}), deviceRouter)
app.use('/subscription', ClerkExpressWithAuth({}), subscriptionRouter)
app.use('/stripe', ClerkExpressWithAuth({}), stripeRouter)

// Connect to database
if(!process.env.MONGO_URI || !process.env.MONGO_DB_NAME) throw new Error('Missing databse environment variables')
const dbURL = process.env.MONGO_URI + process.env.MONGO_DB_NAME

mongoose.connect(dbURL)
const db = mongoose.connection
db.on('connected', () => {
  app.listen(PORT, () => {
    console.log(`Server listening at port ${PORT}`)
  })
})


