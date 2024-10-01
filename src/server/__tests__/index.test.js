import request from 'supertest'
import app from '../index'

describe('App routes', () => {
  it("should return 'This is a private API' for any unknown route", (done) => {
    request(app)
      .get('/')
      .then((response) => {
        expect(response.statusCode).toEqual(404)
        expect(response.text).toEqual('This is a private API')
        done()
      })
  })
})
