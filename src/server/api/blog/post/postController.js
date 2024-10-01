// @flow

import Post from './postModel'
import errorHandler from '../../../middleware/errorHandler'
import cloudinary from 'cloudinary'

function removeAsset(id, res) {
  cloudinary.v2.uploader.destroy(id, (err, result) => errorHandler(err, res))
}

export const list = async (req: Object, res: Object) => {
  try {
    const posts = await Post.find({}).populate('creator').exec()
    res.status(200).json(posts)
  } catch (err) {
    return errorHandler(err, res)
  }
}

export const create = async (req: Object, res: Object) => {
  try {
    let background, background_id

    if (req.file && req.file !== 'undefined') {
      background = req.file.secure_url
      background_id = req.file.public_id
    }

    const postObj = Object.assign({}, req.body, { background, background_id })
    const newPost = new Post(postObj)
    await newPost.save()
    const posts = await Post.find({})
    res.status(201).json(posts)
  } catch (err) {
    return errorHandler(Object.assign(err, { status: '500' }), res)
  }
}

export const postById = async (req: Object, res: Object, next: Function, id: string) => {
  try {
    const post = await Post.findById(id)
    req.post = post
    next()
  } catch (err) {
    return errorHandler(Object.assign(err, { status: '404' }), res)
  }
}

export const read = (req: Object, res: Object) => res.status(200).json(req.post)

export const update = async (req: Object, res: Object) => {
  try {
    let background, background_id

    if (req.file && req.file !== 'undefined') {
      await removeAsset(req.post.background_id, res)
      background = req.file.secure_url
      background_id = req.file.public_id
    } else {
      background = req.post.background
      background_id = req.post.background_id
    }
    const postToUpdate = Object.assign(req.post, req.body, { background, background_id })
    await postToUpdate.save()
    const posts = await Post.find({})
    return res.status(200).json(posts)
  } catch (err) {
    return errorHandler(Object.assign(err, { status: '400' }), res)
  }
}

export const remove = async (req: Object, res: Object) => {
  try {
    const postToRemove = req.post

    if (req.post.background) await removeAsset(req.post.background_id, res)

    await postToRemove.remove()
    const posts = await Post.find({})
    return res.status(200).json(posts)
  } catch (err) {
    return errorHandler(Object.assign(err, { status: '404' }), res)
  }
}
