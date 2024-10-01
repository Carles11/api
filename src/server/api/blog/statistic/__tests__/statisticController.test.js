// @flow

import request from 'supertest-as-promised'
import app from '../../../../index'

describe('[ STATISTICS ]', () => {
  it('should return an Object with the stats', async () => {
    const response = await request(app).get('/api/blog/statistic')

    expect(response.statusCode).toEqual(200)
    expect(response.body).toBeInstanceOf(Object)
    expect(Object.keys(response.body).length).toEqual(3)
  })
})
