// @flow

import request from 'supertest-as-promised'
import app from '../../../../index'

let user = {}

describe('[  USER CRUD  ]', () => {
  const admin = {
    username: 'txiverke',
    password: 'testing',
  }

  describe('Read users', () => {
    it('should return a list of users', async () => {
      const signin = await request(app).post('/auth/signin').send(admin).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).get('/api/blog/users').set('access-token', token)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)

      user = response.body[response.body.length - 1]
    })

    it('should return an specific user', async () => {
      const response = await request(app).get(`/api/blog/users/${user._id}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Object)
    })

    it('should update the user', async () => {
      const body = {
        job: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(admin).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).put(`/api/blog/users/${user._id}`).send(body).set('access-token', token)

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeInstanceOf(Object)
      expect(response.body.job).toEqual('testing')
    })
  })
})
