import { Router } from 'express'
import { ClerkExpressWithAuth, RequireAuthProp, StrictAuthProp } from '@clerk/clerk-sdk-node'
import Company from '../models/company'
import { companyAuthMiddleware } from './tools'
import Device from '../models/device'

const deviceRouter = Router()

deviceRouter.get('/devices', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {

    res.send(await Device.find({ company: req.company._id }))

  } catch(e) {
    console.log('/device', e)
    res.sendStatus(500)
  }
})

deviceRouter.get('/device', companyAuthMiddleware('admin'), async (req, res) => {
  const deviceId = req.header('deviceId')
  if(!deviceId) return res.sendStatus(401)
  res.send(await Device.findOne({$and: [
    {_id: deviceId},
    {company: req.company._id}
  ]}))
})

deviceRouter.post('/new', companyAuthMiddleware('admin'), async(req, res, next) => {
  try {
    const name = req.body.name
    const device_id = req.body.device_id
    const ip_address = req.body.ip_address
    if(!name || !device_id || !ip_address) throw new Error('Missing device details')

    let device = await new Device({
      name,
      company: req.company._id,
      device_id,
      ip_address
    }).save()

    req.company.devices.push(device._id)
    await req.company.save()

    res.send(device)

  } catch(e) {
    console.log(e)
    res.sendStatus(500)
  }
})

export default deviceRouter