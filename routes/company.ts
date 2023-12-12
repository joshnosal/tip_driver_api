import { Router } from 'express'
import Company, { CompanyProps, ICompany } from '../models/company'
import stripe from '../utils/stripe'
import clerk from '../utils/clerk'
import { clerkClient } from '@clerk/clerk-sdk-node'
import emailValidator from 'email-validator'
import randomString from 'randomized-string'
import { companyAuthMiddleware } from './tools'

const companyRouter = Router()

companyRouter.post('/new', async (req, res, next) => {
  try {
    let data: Partial<ICompany> = req.body

    // Check for required fields
    if(
      !data.name ||
      !Array.isArray(data.admins) ||
      !Array.isArray(data.basic_users)
    ) throw new Error('Missing fields')

    // Create new Company
    let company = await new Company({
      name: data.name,
      admins: [req.auth.userId],
    }).save()

    let customer = await stripe.customer.create({
      email: await clerk.getPrimaryEmail(req.auth.userId),
      name: data.name,
      metadata: {
        tip_driver_id: company._id.toString()
      }
    })

    company.stripe_customer_id = customer.id
    await company.save()

    const addUserToCompany = async (userId: string, type: 'admin'|'basic_user') => {
      if(userId === req.auth.userId) return //Skip adding current user
      if(type === 'admin') {
        await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {admins: userId}, $pull: {basic_users: userId}})
      } else {
        await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {basic_users: userId}, $pull: {admins: userId}})
      }
    }

    // Add additional users to the company
    let newUsers: {email: string, role: 'admin'|'basic_user'}[] = []
    for(const e of data.admins) newUsers.push({ email: e, role: 'admin'})
    for(const email of data.basic_users) newUsers.push({ email, role: 'basic_user' })

    for(const user of newUsers) {
      let users = await clerkClient.users.getUserList({ emailAddress: [user.email] })
      if(users.length) {
        if(users[0].id === req.auth.userId) {
          if(!users[0].primaryEmailAddressId) continue
          await clerkClient.emails.createEmail({
            fromEmailName: 'access',
            subject: 'Tip Driver - New Company!',
            body: `Congratulations! You have successfully created the new company ${company.name} on Tip Driver. \n\n\n` +
            `Sign in to check it out. \n\n\nThanks,\n-Tip Driver Team`,
            emailAddressId: users[0].primaryEmailAddressId
          })
          continue
        }
        await addUserToCompany(users[0].id, user.role)
        if(!users[0].primaryEmailAddressId) continue
        await clerkClient.emails.createEmail({
          fromEmailName: 'access',
          subject: 'Tip Driver - New Access',
          body: `You have been added to ${company.name} on Tip Driver. Sign in at ${process.env.WEB_URL} to check it out.\n\n\n Thanks,\n-Tip Driver Team`,
          emailAddressId: users[0].primaryEmailAddressId
        })
        continue
      }
      let password = randomString.generate({length: 10, charset: 'alphanumeric'})
      if(!emailValidator.validate(user.email)) continue
      let newUser = await clerkClient.users.createUser({ emailAddress: [user.email], password, publicMetadata: { verified: false } })
      await addUserToCompany(newUser.id, user.role)
      if(!newUser.primaryEmailAddressId) continue
      await clerkClient.emails.createEmail({
        fromEmailName: 'access',
        subject: 'Tip Driver - Account Setup',
        body: `You have been added to ${company.name} on Tip Driver. Sign in at ${process.env.WEB_URL} to check it out.\n\n\n`+
        `  Your initial password is "${password}"\n\n\n Thanks,\n-Tip Driver Team`,
        emailAddressId: newUser.primaryEmailAddressId
      })
    }

    res.send(company)

  } catch(e) {
    console.log('/new', e)
    res.sendStatus(500)
  }
})

companyRouter.get('/company', companyAuthMiddleware(), async (req, res) => {
  res.send(req.company)
})

companyRouter.get('/promote_user', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const userId = req.header('userId')
    if(userId === req.auth.userId || !userId) throw new Error()

    req.company.admins.push(userId)
    req.company.basic_users = req.company.basic_users.filter(u => u !== userId)
    await req.company.save()
    
    res.send(req.company)

  } catch(e) {
    res.sendStatus(401)
  }
})

companyRouter.get('/demote_user', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const userId = req.header('userId')
    if(userId === req.auth.userId || !userId) throw new Error()

    req.company.basic_users.push(userId)
    req.company.admins = req.company.admins.filter(u => u !== userId)
    await req.company.save()
    
    res.send(req.company)
    
  } catch(e) {
    res.sendStatus(401)
  }
})

companyRouter.post('/remove_users', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const userIds: string[]|undefined = req.body.userIds
    if(!userIds) throw new Error()

    req.company.admins.filter(u => !userIds.includes(u))
    req.company.basic_users.filter(u => !userIds.includes(u))
    await req.company.save()

    res.send(req.company)
  } catch(e) {
    console.log(e)
    res.sendStatus(500)
  }
})

companyRouter.post('/add_user', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const role = req.body.role
    const email = req.body.email
    if(!email) throw new Error()

    let users = await clerkClient.users.getUserList({ emailAddress: [email] })
    if(users.length) {
      role === 'admin' ? req.company.admins.push(users[0].id) : req.company.basic_users.push(users[0].id)
      if(users[0].primaryEmailAddressId) {
        await clerkClient.emails.createEmail({
          fromEmailName: 'access',
          subject: 'Tip Driver - New Access',
          body: `You have been added to ${req.company.name} on Tip Driver. Sign in at ${process.env.WEB_URL} to check it out.\n\n\n Thanks,\n-Tip Driver Team`,
          emailAddressId: users[0].primaryEmailAddressId
        })
      }
    } else {
      let password = randomString.generate({length: 10, charset: 'alphanumeric'})
      if(!emailValidator.validate(email)) throw new Error('Invalid email')
      let newUser = await clerkClient.users.createUser({ emailAddress: [email], password, publicMetadata: { verified: false } })
      role === 'admin' ? req.company.admins.push(users[0].id) : req.company.basic_users.push(users[0].id)
      if(newUser.primaryEmailAddressId) {
        await clerkClient.emails.createEmail({
          fromEmailName: 'access',
          subject: 'Tip Driver - Account Setup',
          body: `You have been added to ${req.company.name} on Tip Driver. Sign in at ${process.env.WEB_URL} to check it out.\n\n\n`+
          `  Your initial password is "${password}"\n\n\n Thanks,\n-Tip Driver Team`,
          emailAddressId: newUser.primaryEmailAddressId
        })
      }
    }
    
    await req.company.save()
    res.send(req.company)
  } catch(e) {
    console.log(e)
    res.sendStatus(500)
  }
})

companyRouter.post('/update', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const fields: (keyof CompanyProps)[] = req.body.fields
    const update: CompanyProps = req.body.company
    if(!fields || !fields.length) throw new Error('Missing update fields')

    for(const key of fields) {
      switch(key) {
        case 'tip_levels': 
          req.company.tip_levels = update.tip_levels
          break;
        case 'custom_tip': 
          req.company.custom_tip = update.custom_tip
          break;
        default: continue
      }
    }
    await req.company.save()
    res.send(req.company)
  } catch(e) {
    res.sendStatus(500)
  }
})



export default companyRouter
