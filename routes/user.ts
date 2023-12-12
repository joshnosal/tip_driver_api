import { Router } from 'express'
import { ClerkExpressWithAuth, RequireAuthProp, StrictAuthProp } from '@clerk/clerk-sdk-node'
import Company from '../models/company'

const userRouter = Router()

userRouter.get('/companies', ClerkExpressWithAuth({}), async (req, res, next) => {
  try {
    let companies = await Company.find({$or: [
      {admins: req.auth.userId},
      {basic_users: req.auth.userId}
    ]}).lean()

    res.send(companies)

  } catch(e) {
    res.sendStatus(500)
  }
})

export default userRouter