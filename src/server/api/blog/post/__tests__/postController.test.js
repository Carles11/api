// @flow

import request from 'supertest-as-promised'
import app from '../../../../index'

let posts = []
let id = ''

describe('[ POST CRUD ]', () => {
  describe('Create', () => {
    const body = {
      title: 'test title',
      file: {
        originalname: 'test.png',
        filename: 'test.png',
      },
      content: 'test content',
      tags: 'test',
      link: 'test.html',
    }

    it('should return Unauthorized', async () => {
      const response = await request(app).post('/api/blog/posts').send(body)
      expect(response.statusCode).toEqual(401)
    })

    it('should return 500 if the right data is not send', async () => {
      const obj = {
        username: 'txiverke',
        password: 'testing',
      }

      const emptyBody = {}

      const signin = await request(app).post('/auth/signin').send(obj).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).post('/api/blog/posts').send(emptyBody).set('access-token', token)

      expect(response.statusCode).toEqual(500)
    })

    it('should create a post', async () => {
      const obj = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(obj).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).post('/api/blog/posts').send(body).set('access-token', token)

      const newPost = response.body.find((item) => item.tags === 'test')
      id = newPost._id

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeInstanceOf(Array)
      expect(response.body[response.body.length - 1].title).toEqual(body.title)

      posts = [...response.body]
    })
  })

  describe('Read', () => {
    it('should return a list of posts', async () => {
      const response = await request(app).get('/api/blog/posts')
      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)

      posts = [...response.body]
    })

    it('should return one post', async () => {
      const response = await request(app).get(`/api/blog/posts/${id}`)
      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Object)
    })

    it('should return a 400 if the id does not exist in the DDBB', async () => {
      const response = await request(app).get('/api/blog/posts/3')
      expect(response.error.status).toEqual(404)
    })
  })

  describe('Update', () => {
    const body = {
      title: 'update test title',
      file: {
        originalname: 'test.png',
        filename: 'test.png',
      },
      content: 'test content',
      tags: 'test',
      link: 'test.html',
    }

    it('should update a post', async () => {
      const obj = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(obj).set('Content-Type', 'application/json')

      const token = signin.body.token

      const response = await request(app).put(`/api/blog/posts/${id}`).send(body).set('access-token', token)

      const post = response.body.find((item) => item._id === id)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeInstanceOf(Array)
      expect(post.title).toEqual(body.title)

      posts = [...response.body]
    })
  })

  describe('Delete', () => {
    it('should delete a post', async () => {
      const obj = {
        username: 'txiverke',
        password: 'testing',
      }

      const signin = await request(app).post('/auth/signin').send(obj).set('Content-Type', 'application/json')

      const token = signin.body.token
      const currentPost = posts.length

      const response = await request(app).delete(`/api/blog/posts/${id}`).set('access-token', token)

      posts = [...response.body]

      expect(response.statusCode).toEqual(200)
      expect(posts).toBeInstanceOf(Array)
      expect(posts.length).toEqual(currentPost - 1)
    })
  })
})
