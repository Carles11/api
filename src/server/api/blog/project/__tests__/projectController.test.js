// @flow

import request from 'supertest-as-promised'
import app from '../../../../index'

let projects = []
let id = ''

describe('[  PROJECT CRUD  ]', () => {
  describe('[ Create a project ]', () => {
    const body = {
      title: 'Testing create projects.',
      file: {
        originalname: 'test.png',
        filename: 'test.png',
      },
      summary: 'test',
    }

    it('should return Unauthorized', async () => {
      const response = await request(app).post('/api/blog/projects').send(body)

      expect(response.statusCode).toEqual(401)
    })

    it('should create a new post', async () => {
      const user = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(user).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).post('/api/blog/projects').send(body).set('access-token', token)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)

      const newProject = response.body.find((item) => item.summary === 'test')
      id = newProject._id
      projects = [...response.body]
    })
  })

  describe('[ Read projects', () => {
    it('should return a list of projects', async () => {
      const response = await request(app).get('/api/blog/projects')
      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)

      projects = [...response.body]
    })

    it('should return one specific post', async () => {
      const response = await request(app).get(`/api/blog/projects/${id}`)
      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Object)
    })

    it('should returm Error if the _id does not exist', async () => {
      const response = await request(app).get('/api/blog/projects/1')
      expect(response.statusCode).toEqual(404)
    })
  })

  describe('Update a project', () => {
    const body = {
      title: 'Updated title test',
      summary: 'New summary test',
    }

    it('should update a post', async () => {
      const user = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(user).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).put(`/api/blog/projects/${id}`).send(body).set('access-token', token)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)

      projects = [...response.body]
      const project = projects.find((item) => item._id === id)
      expect(project.title).toEqual(body.title)
    })
  })

  describe('DELETE post', () => {
    it('should delete a post', async () => {
      const user = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(user).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).delete(`/api/blog/projects/${id}`).set('access-token', token)

      expect(response.statusCode).toEqual(200)
      expect(response.body.length).toEqual(projects.length - 1)
    })
  })
})
